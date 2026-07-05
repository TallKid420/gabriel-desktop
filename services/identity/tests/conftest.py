from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from gabriel_identity.config import Settings
from gabriel_identity.main import create_app
from gabriel_identity.service import IdentityService


@pytest.fixture
def dev_settings() -> Settings:
    return Settings(environment="development", enable_dev_provider=True)


@pytest.fixture
def prod_settings() -> Settings:
    # Even with the flag explicitly on, production must refuse the dev provider.
    return Settings(environment="production", enable_dev_provider=True)


@pytest.fixture
def service(dev_settings: Settings) -> IdentityService:
    return IdentityService(dev_settings)


@pytest.fixture
def client(dev_settings: Settings) -> TestClient:
    return TestClient(create_app(dev_settings))


@pytest.fixture
def prod_client(prod_settings: Settings) -> TestClient:
    return TestClient(create_app(prod_settings))
