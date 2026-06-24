from datetime import datetime
from enum import StrEnum

from sqlalchemy import Boolean, DateTime, Enum, Float, ForeignKey, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.types import JSON

from app.database import Base


class MenuType(StrEnum):
    MAIN = "MAIN"
    SET = "SET"
    SIDE = "SIDE"
    DRINK = "DRINK"


class OptionSelectionType(StrEnum):
    RADIO = "RADIO"
    CHECKBOX = "CHECKBOX"
    QUANTITY = "QUANTITY"


class OptionEffect(StrEnum):
    ADD_ITEM = "ADD_ITEM"
    EXCLUDE_ITEM = "EXCLUDE_ITEM"
    REPLACE_ITEM = "REPLACE_ITEM"
    CHANGE_TASTE = "CHANGE_TASTE"
    LINK_MENU = "LINK_MENU"
    ADD = "ADD"
    EXCLUDE = "EXCLUDE"
    REPLACE = "REPLACE"
    NOTE = "NOTE"
    NONE = "NONE"


class Store(Base):
    __tablename__ = "stores"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    store_id: Mapped[str] = mapped_column(String(64), nullable=False, unique=True, index=True)
    store_name: Mapped[str] = mapped_column(String(120), nullable=False)
    platform: Mapped[str] = mapped_column(String(64), default="MOCK_DELIVERY", nullable=False)
    available: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

class Menu(Base):
    __tablename__ = "menus"
    __table_args__ = (UniqueConstraint("store_id", "menu_id", name="uq_store_menu"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    store_id: Mapped[str] = mapped_column(ForeignKey("stores.store_id"), nullable=False, index=True)
    menu_id: Mapped[str] = mapped_column(String(80), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    type: Mapped[MenuType] = mapped_column(Enum(MenuType), nullable=False, index=True)
    base_price: Mapped[int] = mapped_column(Integer, nullable=False)
    allergens_json: Mapped[dict | None] = mapped_column(JSON)
    quantity_min: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    quantity_max: Mapped[int] = mapped_column(Integer, default=10, nullable=False)
    quantity_default: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    available: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False, index=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

class OptionGroup(Base):
    __tablename__ = "option_groups"
    __table_args__ = (UniqueConstraint("store_id", "menu_id", "group_id", name="uq_menu_group"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    store_id: Mapped[str] = mapped_column(ForeignKey("stores.store_id"), nullable=False, index=True)
    menu_id: Mapped[str] = mapped_column(String(80), nullable=False, index=True)
    group_id: Mapped[str] = mapped_column(String(80), nullable=False, index=True)
    group_name: Mapped[str] = mapped_column(String(120), nullable=False)
    selection_type: Mapped[OptionSelectionType] = mapped_column(Enum(OptionSelectionType), nullable=False)
    required: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    min_select: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    max_select: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    available: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False, index=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

class Option(Base):
    __tablename__ = "options"
    __table_args__ = (UniqueConstraint("store_id", "group_id", "option_id", name="uq_group_option"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    store_id: Mapped[str] = mapped_column(ForeignKey("stores.store_id"), nullable=False, index=True)
    group_id: Mapped[str] = mapped_column(String(80), nullable=False, index=True)
    option_id: Mapped[str] = mapped_column(String(80), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    additional_price: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    effect: Mapped[OptionEffect] = mapped_column(Enum(OptionEffect), default=OptionEffect.NONE, nullable=False)
    linked_menu_id: Mapped[str | None] = mapped_column(String(80))
    default_selected: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    available: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False, index=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )


class ApiConfig(Base):
    __tablename__ = "api_configs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    config_id: Mapped[str] = mapped_column(String(80), nullable=False, unique=True, index=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    provider: Mapped[str] = mapped_column(String(64), nullable=False)
    endpoint: Mapped[str] = mapped_column(String(500), nullable=False)
    model: Mapped[str] = mapped_column(String(120), nullable=False)
    api_key: Mapped[str] = mapped_column(Text, default="", nullable=False)
    temperature: Mapped[float] = mapped_column(Float, default=0.7, nullable=False)
    active: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )


class ConsoleOrderRecord(Base):
    __tablename__ = "console_order_records"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    record_id: Mapped[str] = mapped_column(String(80), nullable=False, unique=True, index=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    http_status: Mapped[int] = mapped_column(Integer, nullable=False)
    store_name: Mapped[str] = mapped_column(String(120), nullable=False)
    payload: Mapped[str] = mapped_column(Text, nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
