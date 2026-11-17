from __future__ import annotations

from fastapi import APIRouter, Depends, File, HTTPException, Query, Response, UploadFile, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import ImportBatch, ImportIssue, User
from ..schemas import ImportConfirmRequest
from ..config import settings
from ..security import require_finance
from ..services import import_service

router = APIRouter(prefix="/api/imports", tags=["imports"])



def _error(exc: Exception) -> HTTPException:
    if isinstance(exc, import_service.ImportErrorDetail):
        return HTTPException(
            status_code=400,
            detail={"code": exc.code, "message": exc.message, **exc.detail},
        )
    return HTTPException(status_code=400, detail=str(exc))


@router.post("/preview")
async def upload_preview(
    file: UploadFile = File(...),
    marketplace: str | None = Query(None),
    sheet: str | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_finance),
):
    content = await file.read()
    try:
        preview = import_service.create_preview(
            db=db,
            filename=file.filename or "import.csv",
            content=content,
            marketplace=import_service.normalise_marketplace_param(marketplace),
            actor=current_user.username,
            sheet_name=sheet,
        )
    except (import_service.ImportErrorDetail, ValueError) as exc:
        raise _error(exc)

    batch = preview.batch
    return {
        "batch_id": batch.id,
        "filename": batch.filename,
        "marketplace": batch.marketplace,
        "total_rows": batch.total_rows,
        "valid_rows": batch.valid_rows,
        "invalid_rows": batch.invalid_rows,
        "duplicate_rows": batch.duplicate_rows,
        "unmatched_sku": batch.unmatched_sku,
        "detected_columns": preview.detected_columns,
        "suggested_mapping": preview.suggested_mapping,
        "field_labels": import_service.FIELD_LABELS,
        "required_fields": import_service.REQUIRED_FIELDS,
        "preview_rows": preview.preview_rows,
        "issues": preview.issues,
        "cleaning": preview.cleaning,
        "sheet_names": preview.sheet_names,
        "limits": {
            "max_file_mb": settings.import_max_file_mb,
            "max_rows": settings.import_max_rows,
            "max_columns": settings.import_max_columns,
        },
    }


@router.post("/{batch_id}/confirm")
def confirm_import(
    batch_id: int,
    payload: ImportConfirmRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_finance),
):
    try:
        result = import_service.confirm_import(
            db=db,
            batch_id=batch_id,
            mapping=payload.mapping,
            actor=current_user.username,
        )
    except (import_service.ImportErrorDetail, ValueError) as exc:
        raise _error(exc)
    return result


@router.get("/batches")
def list_batches(limit: int = 20, db: Session = Depends(get_db), _user: User = Depends(require_finance)):
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
def get_batch(batch_id: int, db: Session = Depends(get_db), _user: User = Depends(require_finance)):
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
