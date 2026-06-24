import uuid
from datetime import datetime
from typing import List

from auth import require_admin
from db import get_db
from fastapi import APIRouter, Depends, Query
from models import RequestLog
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.orm import Session

router = APIRouter(prefix="/requests", tags=["requests"])


class RequestLogItem(BaseModel):
    id: uuid.UUID
    method: str
    path: str
    status_code: int
    latency_ms: float
    auth_type: str
    created_at: datetime

    model_config = {"from_attributes": True}


API_KEY_AUTH_TYPES = ("api_key", "admin_api_key", "disabled", "none", "bearer")


class PaginatedRequestsResponse(BaseModel):
    results: List[RequestLogItem]
    total: int
    page: int
    per_page: int


@router.get("", response_model=PaginatedRequestsResponse)
def list_requests(
    _auth=Depends(require_admin),
    db: Session = Depends(get_db),
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=50, ge=1, le=200),
):
    offset = (page - 1) * per_page
    total = db.execute(select(func.count(RequestLog.id))).scalar()
    logs = (
        db.execute(
            select(RequestLog)
            .where(RequestLog.auth_type.in_(API_KEY_AUTH_TYPES))
            .order_by(RequestLog.created_at.desc())
            .offset(offset)
            .limit(per_page)
        )
        .scalars()
        .all()
    )
    return PaginatedRequestsResponse(
        results=[RequestLogItem.model_validate(log) for log in logs],
        total=total or 0, page=page, per_page=per_page
    )
