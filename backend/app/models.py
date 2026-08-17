import enum
import datetime
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text
)
from sqlalchemy.orm import relationship
from .database import Base


def now():
    return datetime.datetime.utcnow()


class OrgType(str, enum.Enum):
    FACTORY = "factory"
    LAB = "lab"


class Organization(Base):
    __tablename__ = "organizations"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    org_type = Column(String, nullable=False)  # factory | lab
    city = Column(String, nullable=True)
    address = Column(String, nullable=True)
    registration_no = Column(String, nullable=True)
    ntn = Column(String, nullable=True)
    verified = Column(Boolean, default=False)
    accreditation_body = Column(String, nullable=True)
    accreditation_number = Column(String, nullable=True)
    created_at = Column(DateTime, default=now)

    users = relationship("User", back_populates="organization")
    assets = relationship("Asset", back_populates="organization")
    capabilities = relationship("Capability", back_populates="lab_org")


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    role = Column(String, default="admin")  # admin | requester | technician | reviewer
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=True)
    is_admin = Column(Boolean, default=False)  # platform admin (not tied to any organization)
    created_at = Column(DateTime, default=now)

    organization = relationship("Organization", back_populates="users")


class Asset(Base):
    __tablename__ = "assets"
    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id"))
    internal_id = Column(String, nullable=True)
    category = Column(String, nullable=False)
    measurand = Column(String, nullable=False)
    make = Column(String, nullable=True)
    model = Column(String, nullable=True)
    serial_no = Column(String, nullable=True)
    range_min = Column(Float, nullable=True)
    range_max = Column(Float, nullable=True)
    unit = Column(String, nullable=True)
    tolerance = Column(String, nullable=True)
    criticality = Column(String, default="Medium")
    location = Column(String, nullable=True)
    due_date = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=now)

    organization = relationship("Organization", back_populates="assets")


class Capability(Base):
    __tablename__ = "capabilities"
    id = Column(Integer, primary_key=True, index=True)
    lab_org_id = Column(Integer, ForeignKey("organizations.id"))
    service_name = Column(String, nullable=False)
    measurand = Column(String, nullable=False)
    category = Column(String, nullable=False)
    range_min = Column(Float, nullable=True)
    range_max = Column(Float, nullable=True)
    unit = Column(String, nullable=True)
    accredited = Column(Boolean, default=False)
    location_mode = Column(String, default="in_lab")  # in_lab | on_site | both
    turnaround_days = Column(Integer, default=5)
    price = Column(Float, default=0.0)
    cmc_uncertainty = Column(String, nullable=True)
    status = Column(String, default="active")  # active | paused | retired
    created_at = Column(DateTime, default=now)

    lab_org = relationship("Organization", back_populates="capabilities")


class ServiceRequest(Base):
    __tablename__ = "service_requests"
    id = Column(Integer, primary_key=True, index=True)
    factory_org_id = Column(Integer, ForeignKey("organizations.id"))
    asset_id = Column(Integer, ForeignKey("assets.id"))
    service_mode = Column(String, default="in_lab")  # in_lab | on_site | either
    accredited_required = Column(Boolean, default=False)
    statement_of_conformity = Column(Boolean, default=False)
    urgency = Column(String, default="normal")  # normal | express | critical
    desired_date = Column(DateTime, nullable=True)
    adjustment_policy = Column(String, default="ask_first")  # ask_first | preauth | no_adjustment
    tolerance_note = Column(String, nullable=True)
    notes = Column(Text, nullable=True)
    status = Column(String, default="REQUEST_SUBMITTED")
    created_at = Column(DateTime, default=now)

    asset = relationship("Asset")
    quotes = relationship("Quote", back_populates="request")


class Quote(Base):
    __tablename__ = "quotes"
    id = Column(Integer, primary_key=True, index=True)
    request_id = Column(Integer, ForeignKey("service_requests.id"))
    lab_org_id = Column(Integer, ForeignKey("organizations.id"))
    price = Column(Float, nullable=False)
    transport_cost = Column(Float, default=0.0)  # cost if Digi_CalX arranges pickup/delivery
    turnaround_days = Column(Integer, default=5)
    accredited = Column(Boolean, default=False)
    notes = Column(Text, nullable=True)
    status = Column(String, default="pending")  # pending | accepted | rejected
    created_at = Column(DateTime, default=now)

    request = relationship("ServiceRequest", back_populates="quotes")
    lab_org = relationship("Organization")


class Job(Base):
    __tablename__ = "jobs"
    id = Column(Integer, primary_key=True, index=True)
    request_id = Column(Integer, ForeignKey("service_requests.id"))
    quote_id = Column(Integer, ForeignKey("quotes.id"))
    factory_org_id = Column(Integer, ForeignKey("organizations.id"))
    lab_org_id = Column(Integer, ForeignKey("organizations.id"))
    asset_id = Column(Integer, ForeignKey("assets.id"))
    status = Column(String, default="AWAITING_PAYMENT")
    as_found_result = Column(Text, nullable=True)
    conformity = Column(String, nullable=True)  # pass | fail | indeterminate | not_requested
    adjustment_requested = Column(Boolean, default=False)
    adjustment_authorized = Column(Boolean, default=False)
    as_left_result = Column(Text, nullable=True)

    # transport & payment
    transport_mode = Column(String, nullable=True)  # self | calx
    transport_cost = Column(Float, default=0.0)
    calibration_price = Column(Float, default=0.0)
    total_amount = Column(Float, default=0.0)  # calibration_price + transport_cost (if calx)
    proposed_adjustment_cost = Column(Float, nullable=True)  # lab's quoted extra repair/adjustment charge
    platform_commission_rate = Column(Float, default=0.10)

    created_at = Column(DateTime, default=now)
    updated_at = Column(DateTime, default=now, onupdate=now)

    request = relationship("ServiceRequest")
    asset = relationship("Asset")
    factory_org = relationship("Organization", foreign_keys=[factory_org_id])
    lab_org = relationship("Organization", foreign_keys=[lab_org_id])
    history = relationship("JobStatusHistory", back_populates="job")
    certificates = relationship("Certificate", back_populates="job")


class JobStatusHistory(Base):
    __tablename__ = "job_status_history"
    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, ForeignKey("jobs.id"))
    status = Column(String, nullable=False)
    actor = Column(String, nullable=True)
    note = Column(Text, nullable=True)
    created_at = Column(DateTime, default=now)

    job = relationship("Job", back_populates="history")


class Certificate(Base):
    __tablename__ = "certificates"
    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, ForeignKey("jobs.id"))
    cert_number = Column(String, nullable=False)
    version = Column(Integer, default=1)
    file_path = Column(String, nullable=True)
    superseded = Column(Boolean, default=False)
    amendment_reason = Column(String, nullable=True)
    issued_at = Column(DateTime, default=now)

    job = relationship("Job", back_populates="certificates")


class Rating(Base):
    __tablename__ = "ratings"
    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, ForeignKey("jobs.id"))
    factory_org_id = Column(Integer, ForeignKey("organizations.id"))
    lab_org_id = Column(Integer, ForeignKey("organizations.id"))
    communication = Column(Integer, default=5)
    turnaround = Column(Integer, default=5)
    handling = Column(Integer, default=5)
    document_clarity = Column(Integer, default=5)
    overall = Column(Integer, default=5)
    comment = Column(Text, nullable=True)
    created_at = Column(DateTime, default=now)


class Payment(Base):
    __tablename__ = "payments"
    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, ForeignKey("jobs.id"))
    payer_org_id = Column(Integer, ForeignKey("organizations.id"))
    kind = Column(String, nullable=False)  # booking | adjustment
    amount = Column(Float, nullable=False)
    status = Column(String, default="pending")  # pending | paid
    method = Column(String, default="dummy")  # dummy gateway for now
    created_at = Column(DateTime, default=now)
    paid_at = Column(DateTime, nullable=True)


class WalletTransaction(Base):
    __tablename__ = "wallet_transactions"
    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id"))
    job_id = Column(Integer, ForeignKey("jobs.id"), nullable=True)
    amount = Column(Float, nullable=False)  # positive = credit to org wallet
    tx_type = Column(String, nullable=False)  # payout | commission | refund
    description = Column(String, nullable=True)
    created_at = Column(DateTime, default=now)


class Dispute(Base):
    __tablename__ = "disputes"
    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, ForeignKey("jobs.id"))
    opened_by_org_id = Column(Integer, ForeignKey("organizations.id"))
    dispute_type = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    status = Column(String, default="open")  # open | dismissed | partially_upheld | upheld
    resolution = Column(Text, nullable=True)
    resolved_by = Column(String, nullable=True)  # admin email who resolved it
    resolved_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=now)


class PlatformConfig(Base):
    """Single-row table holding global platform settings (e.g. commission rate)."""
    __tablename__ = "platform_config"
    id = Column(Integer, primary_key=True, index=True)
    commission_rate = Column(Float, default=0.10)
    updated_at = Column(DateTime, default=now, onupdate=now)
