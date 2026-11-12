from fastapi import APIRouter, Depends, File, HTTPException, Query, Response, UploadFile, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import ImportBatch, ImportIssue, User
from ..schemas import ImportConfirmRequest
from ..security import get_current_user_optional
from ..services import import_service

router = APIRouter(prefix="/api/imports", tags=["imports"])


@router.post("/preview")
async def upload_preview(
    file: UploadFile = File(...),
    marketplace: str | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
):
    actor = current_user.username if current_user else "uploader"
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="File kosong.")

    try:
        preview = import_service.create_preview(
            db=db,
            filename=file.filename or "import.csv",
            content=content,
            marketplace=marketplace,
            created_by=actor,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return {
        "batch_id": preview.batch_id,
        "filename": preview.filename,
        "total_rows": preview.total_rows,
        "detected_columns": preview.detected_columns,
        "suggested_mapping": preview.suggested_mapping,
        "preview_rows": preview.preview_rows,
        "issues": preview.issues,
        "limits": preview.limits,
    }


@router.post("/{batch_id}/confirm")
def confirm_import(
    batch_id: int,
    payload: ImportConfirmRequest,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
):
    actor = current_user.username if current_user else "importer"
    try:
        result = import_service.confirm_import(
            db=db,
            batch_id=batch_id,
            mapping=payload.mapping,
            actor=actor,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return {
        "batch_id": result.batch_id,
        "status": result.status,
        "total_rows": result.total_rows,
        "valid_rows": result.valid_rows,
        "invalid_rows": result.invalid_rows,
        "duplicate_rows": result.duplicate_rows,
        "unmatched_sku": result.unmatched_sku,
        "issues": result.issues,
        "calculation_run_id": result.calculation_run_id,
    }


@router.get("/batches")
def list_batches(limit: int = 20, db: Session = Depends(get_db)):
    batches = db.scalars(
        select(ImportBatch).order_by(ImportBatch.created_at.desc()).limit(limit)
    ).all()
    return {
        "batches": [
            {
                "id": b.id,
                "filename": b.filename,
                "marketplace": b.marketplace,
                "status": b.status,
                "total_rows": b.total_rows,
                "valid_rows": b.valid_rows,
                "invalid_rows": b.invalid_rows,
                "duplicate_rows": b.duplicate_rows,
                "unmatched_sku": b.unmatched_sku,
                "created_by": b.created_by,
                "created_at": b.created_at.isoformat(),
                "confirmed_at": b.confirmed_at.isoformat() if b.confirmed_at else None,
            }
            for b in batches
        ]
    }


@router.get("/{batch_id}")
def get_batch(batch_id: int, db: Session = Depends(get_db)):
    batch = db.get(ImportBatch, batch_id)
    if not batch:
        raise HTTPException(status_code=404, detail="Batch import tidak ditemukan.")

    issues = db.scalars(
        select(ImportIssue)
        .where(ImportIssue.batch_id == batch.id)
        .order_by(ImportIssue.row_number)
        .limit(100)
    ).all()

    return {
        "batch": {
            "id": batch.id,
            "filename": batch.filename,
            "marketplace": batch.marketplace,
            "status": batch.status,
            "total_rows": batch.total_rows,
            "valid_rows": batch.valid_rows,
            "invalid_rows": batch.invalid_rows,
            "duplicate_rows": batch.duplicate_rows,
            "unmatched_sku": batch.unmatched_sku,
            "created_by": batch.created_by,
            "created_at": batch.created_at.isoformat(),
            "confirmed_at": batch.confirmed_at.isoformat() if batch.confirmed_at else None,
        },
        "issues": [
            {
                "row_number": i.row_number,
                "field": i.field,
                "value": i.value,
                "reason": i.reason,
                "severity": i.severity,
            }
            for i in issues
        ],
    }


@router.get("/templates/{marketplace}")
def download_template(marketplace: str):
    csv_text = import_service.template_csv(marketplace)
    return Response(
        content=csv_text,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=template_{marketplace.lower()}.csv"},
    )
