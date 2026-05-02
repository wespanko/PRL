import pytest
from data.fetcher import _clear_cache


@pytest.fixture(autouse=True)
def clear_price_cache():
    _clear_cache()
    yield
    _clear_cache()
