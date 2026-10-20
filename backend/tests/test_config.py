from app.core.config import Settings


def test_cors_origins_accept_comma_separated_constructor_value() -> None:
    settings = Settings(
        _env_file=None,
        cors_allowed_origins=(
            "https://shramik-unified-app.vercel.app, http://localhost:5173"
        ),
    )

    assert settings.cors_allowed_origins == [
        "https://shramik-unified-app.vercel.app",
        "http://localhost:5173",
    ]


def test_cors_origins_accept_comma_separated_environment_value(monkeypatch) -> None:
    monkeypatch.setenv(
        "CORS_ALLOWED_ORIGINS",
        "https://shramik-unified-app.vercel.app, http://localhost:5173",
    )

    settings = Settings(_env_file=None)

    assert settings.cors_allowed_origins == [
        "https://shramik-unified-app.vercel.app",
        "http://localhost:5173",
    ]


def test_cors_origins_keep_list_input_unchanged() -> None:
    origins = ["https://one.example", "https://two.example"]

    settings = Settings(_env_file=None, cors_allowed_origins=origins)

    assert settings.cors_allowed_origins == origins
