from pydantic_settings import BaseSettings
from pydantic import Field


class Settings(BaseSettings):
    # GENERAL
    debug: bool = Field(False, env="DEBUG")

    # DATABASE
    database_name: str = Field(env="DATABASE_NAME")
    database_username: str = Field(env="DATABASE_USERNAME")
    database_password: str = Field(env="DATABASE_PASSWORD")
    database_host: str = Field(env="DATABASE_HOST")
    database_port: str = Field(env="DATABASE_PORT")

    # JWT
    secret_key: str = Field(env="SECRET_KEY")
    algorithm: str = Field(env="ALGORITHM")
    access_token_expiry_time: int = Field(15, env="ACCESS_TOKEN_EXPIRE_TIME")
    refresh_token_expiry_time: int = Field(30, env="REFRESH_TOKEN_EXPIRE_TIME")

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
