from datetime import datetime, timedelta, timezone

from sqlalchemy import select

from app.database import Base, SessionLocal, engine
from app.models import ApprovalStatus, RefreshToken, Store, User, UserRole
from app.schemas import AuthResponse, CurrentUserResponse, RegisterRequest, UpdateApprovalStatusIn


def setup_function() -> None:
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)


def test_auth_models_persist_user_store_and_refresh_token() -> None:
    with SessionLocal() as db:
        store = Store(
            store_id="STORE_AUTH_001",
            store_name="Auth Test Store",
            phone="010-0000-0000",
            zip_no="12345",
            road_address="서울시 테스트로 1",
            jibun_address="서울시 테스트동 1-1",
            address_detail="101호",
            approval_status=ApprovalStatus.PENDING_APPROVAL,
        )
        db.add(store)
        db.flush()

        user = User(
            login_id="owner",
            password_hash="hashed-password",
            name="Owner",
            role=UserRole.STORE_OWNER,
            approval_status=ApprovalStatus.PENDING_APPROVAL,
            store_id=store.store_id,
        )
        db.add(user)
        db.flush()

        refresh_token = RefreshToken(
            user_id=user.id,
            token_hash="hashed-refresh-token",
            expires_at=datetime.now(timezone.utc) + timedelta(days=14),
        )
        db.add(refresh_token)
        db.commit()

        saved_user = db.scalar(select(User).where(User.login_id == "owner"))
        assert saved_user is not None
        assert saved_user.store.store_id == "STORE_AUTH_001"
        assert saved_user.role == UserRole.STORE_OWNER
        assert saved_user.approval_status == ApprovalStatus.PENDING_APPROVAL
        assert saved_user.refresh_tokens[0].token_hash == "hashed-refresh-token"


def test_auth_phase_one_schemas_accept_expected_payloads() -> None:
    register = RegisterRequest(
        name="Owner",
        loginId="owner",
        password="password1234",
        storeName="Auth Test Store",
        storePhone="010-0000-0000",
        zipNo="12345",
        roadAddress="서울시 테스트로 1",
        jibunAddress="서울시 테스트동 1-1",
        addressDetail="101호",
    )
    assert register.storeName == "Auth Test Store"

    auth_response = AuthResponse(
        accessToken="access-token",
        refreshToken="refresh-token",
        autoLogin=False,
        user={
            "id": 1,
            "loginId": "owner",
            "name": "Owner",
            "role": "STORE_OWNER",
            "approvalStatus": "APPROVED",
        },
        store={
            "id": 1,
            "storeId": "STORE_AUTH_001",
            "storeName": "Auth Test Store",
            "phone": "010-0000-0000",
            "zipNo": "12345",
            "roadAddress": "서울시 테스트로 1",
            "jibunAddress": "서울시 테스트동 1-1",
            "addressDetail": "101호",
            "approvalStatus": "APPROVED",
        },
    )
    assert auth_response.user.role == UserRole.STORE_OWNER
    assert auth_response.store.storeId == "STORE_AUTH_001"

    current_user = CurrentUserResponse.model_validate(auth_response.model_dump())
    assert current_user.user.approvalStatus == ApprovalStatus.APPROVED

    approval_update = UpdateApprovalStatusIn(approvalStatus="APPROVED")
    assert approval_update.approvalStatus == "APPROVED"
