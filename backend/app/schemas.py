import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr


class OrgOut(BaseModel):
    id: int
    name: str
    org_type: str
    city: Optional[str] = None
    verified: bool = False
    accreditation_body: Optional[str] = None
    accreditation_number: Optional[str] = None
    avg_rating: Optional[float] = None
    rating_count: int = 0

    class Config:
        from_attributes = True


class RegisterIn(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    org_name: str
    org_type: str  # factory | lab
    city: Optional[str] = None


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: int
    full_name: str
    email: str
    role: str
    is_admin: bool = False
    organization: Optional[OrgOut] = None

    class Config:
        from_attributes = True


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


# ---------- Assets ----------
class AssetIn(BaseModel):
    internal_id: Optional[str] = None
    category: str
    measurand: str
    make: Optional[str] = None
    model: Optional[str] = None
    serial_no: Optional[str] = None
    range_min: Optional[float] = None
    range_max: Optional[float] = None
    unit: Optional[str] = None
    tolerance: Optional[str] = None
    criticality: Optional[str] = "Medium"
    location: Optional[str] = None
    due_date: Optional[datetime.datetime] = None


class AssetOut(AssetIn):
    id: int
    organization_id: int
    created_at: datetime.datetime

    class Config:
        from_attributes = True


# ---------- Capabilities ----------
class CapabilityIn(BaseModel):
    service_name: str
    measurand: str
    category: str
    range_min: Optional[float] = None
    range_max: Optional[float] = None
    unit: Optional[str] = None
    accredited: bool = False
    location_mode: str = "in_lab"
    turnaround_days: int = 5
    price: float = 0.0
    cmc_uncertainty: Optional[str] = None
    status: str = "active"


class CapabilityOut(CapabilityIn):
    id: int
    lab_org_id: int
    created_at: datetime.datetime

    class Config:
        from_attributes = True


# ---------- Requests ----------
class ServiceRequestIn(BaseModel):
    asset_id: int
    service_mode: str = "in_lab"
    accredited_required: bool = False
    statement_of_conformity: bool = False
    urgency: str = "normal"
    desired_date: Optional[datetime.datetime] = None
    adjustment_policy: str = "ask_first"
    tolerance_note: Optional[str] = None
    notes: Optional[str] = None


class ServiceRequestOut(BaseModel):
    id: int
    factory_org_id: int
    asset_id: int
    service_mode: str
    accredited_required: bool
    statement_of_conformity: bool
    urgency: str
    desired_date: Optional[datetime.datetime]
    adjustment_policy: str
    tolerance_note: Optional[str]
    notes: Optional[str]
    status: str
    created_at: datetime.datetime
    asset: Optional[AssetOut] = None

    class Config:
        from_attributes = True


class MatchOut(BaseModel):
    capability: CapabilityOut
    lab: OrgOut
    explanation: List[str]


# ---------- Quotes ----------
class QuoteIn(BaseModel):
    price: float
    transport_cost: float = 0.0
    turnaround_days: int = 5
    accredited: bool = False
    notes: Optional[str] = None


class QuoteOut(BaseModel):
    id: int
    request_id: int
    lab_org_id: int
    price: float
    transport_cost: float
    turnaround_days: int
    accredited: bool
    notes: Optional[str]
    status: str
    created_at: datetime.datetime
    lab_org: Optional[OrgOut] = None

    class Config:
        from_attributes = True


class QuoteAcceptIn(BaseModel):
    transport_mode: str = "self"  # self | calx


# ---------- Jobs ----------
class JobOut(BaseModel):
    id: int
    request_id: int
    quote_id: int
    factory_org_id: int
    lab_org_id: int
    asset_id: int
    status: str
    as_found_result: Optional[str]
    conformity: Optional[str]
    adjustment_requested: bool
    adjustment_authorized: bool
    as_left_result: Optional[str]
    transport_mode: Optional[str]
    transport_cost: float
    calibration_price: float
    total_amount: float
    proposed_adjustment_cost: Optional[float]
    platform_commission_rate: float
    created_at: datetime.datetime
    updated_at: datetime.datetime
    asset: Optional[AssetOut] = None
    factory_org: Optional[OrgOut] = None
    lab_org: Optional[OrgOut] = None

    class Config:
        from_attributes = True


class JobHistoryOut(BaseModel):
    id: int
    status: str
    actor: Optional[str]
    note: Optional[str]
    created_at: datetime.datetime

    class Config:
        from_attributes = True


class JobTransitionIn(BaseModel):
    status: str
    note: Optional[str] = None


class AsFoundIn(BaseModel):
    as_found_result: str
    conformity: str  # pass | fail | indeterminate | not_requested
    proposed_adjustment_cost: Optional[float] = None  # lab's quoted repair/adjustment charge if OOT


class AdjustmentDecisionIn(BaseModel):
    authorized: bool
    note: Optional[str] = None


class AsLeftIn(BaseModel):
    as_left_result: str


# ---------- Payments (dummy gateway) ----------
class PaymentOut(BaseModel):
    id: int
    job_id: int
    payer_org_id: int
    kind: str
    amount: float
    status: str
    method: str
    created_at: datetime.datetime
    paid_at: Optional[datetime.datetime]

    class Config:
        from_attributes = True


# ---------- Wallet ----------
class WalletTransactionOut(BaseModel):
    id: int
    job_id: Optional[int]
    amount: float
    tx_type: str
    description: Optional[str]
    created_at: datetime.datetime

    class Config:
        from_attributes = True


class WalletOut(BaseModel):
    balance: float
    transactions: List[WalletTransactionOut]


# ---------- Certificates ----------
class CertificateOut(BaseModel):
    id: int
    job_id: int
    cert_number: str
    version: int
    file_path: Optional[str]
    superseded: bool
    amendment_reason: Optional[str]
    issued_at: datetime.datetime

    class Config:
        from_attributes = True


# ---------- Ratings ----------
class RatingIn(BaseModel):
    communication: int = 5
    turnaround: int = 5
    handling: int = 5
    document_clarity: int = 5
    overall: int = 5
    comment: Optional[str] = None


class RatingOut(RatingIn):
    id: int
    job_id: int
    created_at: datetime.datetime

    class Config:
        from_attributes = True


# ---------- Disputes ----------
class DisputeIn(BaseModel):
    dispute_type: str
    description: str


class DisputeOut(BaseModel):
    id: int
    job_id: int
    opened_by_org_id: int
    dispute_type: str
    description: str
    status: str
    resolution: Optional[str]
    resolved_by: Optional[str] = None
    resolved_at: Optional[datetime.datetime] = None
    created_at: datetime.datetime

    class Config:
        from_attributes = True


# ---------- Admin ----------
class AdminLoginIn(BaseModel):
    email: EmailStr
    password: str


class AdminStatsOut(BaseModel):
    total_factories: int
    total_labs: int
    total_assets: int
    total_requests: int
    total_quotes: int
    total_jobs: int
    jobs_by_status: dict
    open_disputes: int
    gross_collected: float
    platform_commission_earned: float
    commission_rate: float


class OrgAdminOut(OrgOut):
    registration_no: Optional[str] = None
    ntn: Optional[str] = None
    address: Optional[str] = None
    created_at: Optional[datetime.datetime] = None


class DisputeResolveIn(BaseModel):
    status: str  # dismissed | partially_upheld | upheld
    resolution: str


class CommissionRateIn(BaseModel):
    commission_rate: float  # e.g. 0.10 for 10%


class CommissionRateOut(BaseModel):
    commission_rate: float


class AdminWalletTxOut(WalletTransactionOut):
    organization_name: Optional[str] = None
    organization_id: int
