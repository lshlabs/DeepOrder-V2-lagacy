from __future__ import annotations

from datetime import datetime
from enum import StrEnum

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import JSON

from app.database import Base


class OrderStatus(StrEnum):
    NEW = "NEW"
    COOKING = "COOKING"
    DONE = "DONE"
    CANCELLED = "CANCELLED"


class WebhookEventStatus(StrEnum):
    PROCESSED = "PROCESSED"
    DUPLICATE = "DUPLICATE"
    FAILED = "FAILED"


class RiskLevel(StrEnum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"


class AnalysisStatus(StrEnum):
    PENDING = "PENDING"
    COMPLETED = "COMPLETED"
    FALLBACK = "FALLBACK"
    FAILED = "FAILED"


class UserRole(StrEnum):
    STORE_OWNER = "STORE_OWNER"
    ADMIN = "ADMIN"


class AccountType(StrEnum):
    OWNER = "OWNER"
    EMPLOYEE = "EMPLOYEE"


class ApprovalStatus(StrEnum):
    PENDING_APPROVAL = "PENDING_APPROVAL"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"


class StoreOperatingStatus(StrEnum):
    OPEN = "OPEN"
    PAUSED = "PAUSED"
    CLOSED = "CLOSED"


class StoreStatusSource(StrEnum):
    MANUAL = "MANUAL"
    BREAKTIME = "BREAKTIME"


class Store(Base):
    __tablename__ = "stores"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    store_id: Mapped[str] = mapped_column(String(64), nullable=False, unique=True, index=True)
    store_name: Mapped[str] = mapped_column(String(120), nullable=False)
    phone: Mapped[str | None] = mapped_column(String(32))
    zip_no: Mapped[str | None] = mapped_column(String(16))
    road_address: Mapped[str | None] = mapped_column(String(255))
    jibun_address: Mapped[str | None] = mapped_column(String(255))
    address_detail: Mapped[str | None] = mapped_column(String(255))
    approval_status: Mapped[ApprovalStatus] = mapped_column(
        Enum(ApprovalStatus), default=ApprovalStatus.PENDING_APPROVAL, nullable=False, index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    users: Mapped[list["User"]] = relationship(back_populates="store")


class WebhookEvent(Base):
    __tablename__ = "webhook_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    event_id: Mapped[str] = mapped_column(String(128), nullable=False, unique=True, index=True)
    event_type: Mapped[str] = mapped_column(String(64), nullable=False)
    platform: Mapped[str] = mapped_column(String(64), nullable=False)
    store_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    status: Mapped[WebhookEventStatus] = mapped_column(Enum(WebhookEventStatus), nullable=False)
    raw_payload: Mapped[dict] = mapped_column(JSON, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class Order(Base):
    __tablename__ = "orders"
    __table_args__ = (UniqueConstraint("platform", "external_order_id", name="uq_platform_order"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    platform: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    store_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    external_order_id: Mapped[str] = mapped_column(String(128), nullable=False)
    order_number: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    status: Mapped[OrderStatus] = mapped_column(
        Enum(OrderStatus), default=OrderStatus.NEW, nullable=False, index=True
    )
    customer_request: Mapped[str | None] = mapped_column(Text)
    delivery_request: Mapped[str | None] = mapped_column(Text)
    raw_payload: Mapped[dict] = mapped_column(JSON, nullable=False)
    ordered_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    items: Mapped[list["OrderItem"]] = relationship(
        back_populates="order", cascade="all, delete-orphan", lazy="selectin"
    )
    ai_analysis: Mapped["OrderAIAnalysis | None"] = relationship(
        back_populates="order", cascade="all, delete-orphan", lazy="selectin"
    )


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    login_id: Mapped[str] = mapped_column(String(64), nullable=False, unique=True, index=True)
    password_hash: Mapped[str | None] = mapped_column(String(255))
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    role: Mapped[UserRole] = mapped_column(Enum(UserRole), default=UserRole.STORE_OWNER, nullable=False)
    account_type: Mapped[AccountType] = mapped_column(
        Enum(AccountType), default=AccountType.OWNER, nullable=False, index=True
    )
    approval_status: Mapped[ApprovalStatus] = mapped_column(
        Enum(ApprovalStatus), default=ApprovalStatus.PENDING_APPROVAL, nullable=False, index=True
    )
    store_id: Mapped[str] = mapped_column(ForeignKey("stores.store_id"), nullable=False, index=True)
    owner_user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), index=True)
    pin_hash: Mapped[str | None] = mapped_column(String(255))
    position_label: Mapped[str | None] = mapped_column(String(120))
    active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    store: Mapped[Store] = relationship(back_populates="users")
    refresh_tokens: Mapped[list["RefreshToken"]] = relationship(
        back_populates="user", cascade="all, delete-orphan", lazy="selectin"
    )


class OrderItem(Base):
    __tablename__ = "order_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    order_id: Mapped[int] = mapped_column(ForeignKey("orders.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    options: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    unit_price: Mapped[int | None] = mapped_column(Integer)
    total_price: Mapped[int | None] = mapped_column(Integer)

    order: Mapped[Order] = relationship(back_populates="items")


class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    token_hash: Mapped[str] = mapped_column(String(255), nullable=False, unique=True, index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    user: Mapped[User] = relationship(back_populates="refresh_tokens")


class OrderAIAnalysis(Base):
    __tablename__ = "order_ai_analysis"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    order_id: Mapped[int] = mapped_column(ForeignKey("orders.id"), nullable=False, unique=True, index=True)
    summary: Mapped[str] = mapped_column(Text, default="", nullable=False)
    tags: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    cooking_notes: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    packing_notes: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    delivery_notes: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    kitchen_actions: Mapped[list[dict]] = mapped_column(JSON, default=list, nullable=False)
    packing_actions: Mapped[list[dict]] = mapped_column(JSON, default=list, nullable=False)
    ignored_requests: Mapped[list[dict]] = mapped_column(JSON, default=list, nullable=False)
    risk_level: Mapped[RiskLevel] = mapped_column(Enum(RiskLevel), default=RiskLevel.LOW, nullable=False)
    warnings: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    needs_human_check: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    analysis_status: Mapped[AnalysisStatus] = mapped_column(
        Enum(AnalysisStatus), default=AnalysisStatus.PENDING, nullable=False, index=True
    )
    error_message: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    order: Mapped[Order] = relationship(back_populates="ai_analysis")


class StoreSettings(Base):
    __tablename__ = "store_settings"
    __table_args__ = (UniqueConstraint("store_id", name="uq_store_settings_store"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    store_id: Mapped[str] = mapped_column(ForeignKey("stores.store_id"), nullable=False, index=True)
    operating_status: Mapped[StoreOperatingStatus] = mapped_column(
        Enum(StoreOperatingStatus), default=StoreOperatingStatus.OPEN, nullable=False
    )
    paused_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    status_source: Mapped[StoreStatusSource] = mapped_column(
        Enum(StoreStatusSource), default=StoreStatusSource.MANUAL, nullable=False
    )
    notifications_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    notification_sound: Mapped[str] = mapped_column(String(32), default="classic", nullable=False)
    breaktime_enabled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    breaktime_start_hour: Mapped[int] = mapped_column(Integer, default=15, nullable=False)
    breaktime_start_minute: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    breaktime_duration_minutes: Mapped[int] = mapped_column(Integer, default=30, nullable=False)
    auto_accept: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )


class UserAssignedMenu(Base):
    __tablename__ = "user_assigned_menus"
    __table_args__ = (UniqueConstraint("user_id", "normalized_menu_name", name="uq_user_assigned_menu_name"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    store_id: Mapped[str] = mapped_column(ForeignKey("stores.store_id"), nullable=False, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    menu_name: Mapped[str] = mapped_column(String(120), nullable=False)
    normalized_menu_name: Mapped[str] = mapped_column(String(120), nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )


class KdsOrderState(Base):
    __tablename__ = "kds_order_state"
    __table_args__ = (UniqueConstraint("order_id", "store_id", name="uq_kds_order_state_order_store"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    order_id: Mapped[int] = mapped_column(ForeignKey("orders.id"), nullable=False, index=True)
    store_id: Mapped[str] = mapped_column(ForeignKey("stores.store_id"), nullable=False, index=True)
    hidden_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    hidden_by_user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), index=True)
    archived_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    archived_by_user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )


class KdsOrderItemProgress(Base):
    __tablename__ = "kds_order_item_progress"
    __table_args__ = (UniqueConstraint("order_item_id", "store_id", name="uq_kds_item_progress_item_store"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    order_item_id: Mapped[int] = mapped_column(ForeignKey("order_items.id"), nullable=False, index=True)
    store_id: Mapped[str] = mapped_column(ForeignKey("stores.store_id"), nullable=False, index=True)
    done: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    done_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    done_by_user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
