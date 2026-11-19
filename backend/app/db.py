import os, re, datetime as dt
from sqlalchemy import create_engine, String, JSON, DateTime, ForeignKey
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, sessionmaker
URL = re.sub(r"^postgres(ql)?://", "postgresql+psycopg://", os.getenv("DATABASE_URL", "sqlite:///./vyntra.db"))
engine = create_engine(URL, connect_args={"check_same_thread": False} if URL.startswith("sqlite") else {})
Session = sessionmaker(engine, expire_on_commit=False)
now = lambda: dt.datetime.utcnow()
class Base(DeclarativeBase): pass
class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(primary_key=True)
    username: Mapped[str] = mapped_column(String(60), unique=True)
    password_hash: Mapped[str] = mapped_column(String(200))
    role: Mapped[str] = mapped_column(String(20))
    active: Mapped[bool] = mapped_column(default=True)
class Dataset(Base):
    __tablename__ = "datasets"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(200))
    source: Mapped[str] = mapped_column(String(20))
    file_key: Mapped[str] = mapped_column(String(80))
    owner_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    row_count: Mapped[int]
    column_count: Mapped[int]
    status: Mapped[str] = mapped_column(String(30))
    profile: Mapped[dict] = mapped_column(JSON, default=dict)
    enabled: Mapped[bool] = mapped_column(default=True)
    created_at: Mapped[dt.datetime] = mapped_column(DateTime, default=now)
class Practice(Base):
    __tablename__ = "practices"
    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(200))
    objective: Mapped[str] = mapped_column(String(500))
    approach: Mapped[str] = mapped_column(String(5))
    target: Mapped[str | None] = mapped_column(String(100), nullable=True)
    dataset_id: Mapped[int] = mapped_column(ForeignKey("datasets.id"))
    created_by: Mapped[int] = mapped_column(ForeignKey("users.id"))
    features: Mapped[list] = mapped_column(JSON, default=list)
class Execution(Base):
    __tablename__ = "executions"
    id: Mapped[int] = mapped_column(primary_key=True)
    practice_id: Mapped[int] = mapped_column(ForeignKey("practices.id"))
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    status: Mapped[str] = mapped_column(String(30))
    engine_type: Mapped[str] = mapped_column(String(20))
    engine_version: Mapped[str] = mapped_column(String(60))
    started_at: Mapped[dt.datetime] = mapped_column(DateTime)
    finished_at: Mapped[dt.datetime | None] = mapped_column(DateTime, nullable=True)
    result: Mapped[dict] = mapped_column(JSON, default=dict)
    error: Mapped[str | None] = mapped_column(String(40), nullable=True)
    reviewed: Mapped[bool] = mapped_column(default=False)
    stage: Mapped[str] = mapped_column(String(20), default="")
class Audit(Base):
    __tablename__ = "audit_events"
    id: Mapped[int] = mapped_column(primary_key=True)
    actor: Mapped[str] = mapped_column(String(60))
    action: Mapped[str] = mapped_column(String(60))
    entity: Mapped[str] = mapped_column(String(40), default="")
    entity_id: Mapped[int | None] = mapped_column(nullable=True)
    result: Mapped[str] = mapped_column(String(40), default="ok")
    at: Mapped[dt.datetime] = mapped_column(DateTime, default=now)
def audit(actor, action, entity="", eid=None, result="ok"):
    with Session() as s:
        s.add(Audit(actor=actor, action=action, entity=entity, entity_id=eid, result=result)); s.commit()
class Unit(Base):
    __tablename__ = "units"
    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(120))
    body: Mapped[str] = mapped_column(String(1000))
    question: Mapped[str] = mapped_column(String(300))
    options: Mapped[list] = mapped_column(JSON, default=list)
    answer: Mapped[int] = mapped_column(default=0)
class Progress(Base):
    __tablename__ = "progress"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    unit_id: Mapped[int] = mapped_column(ForeignKey("units.id"))
class Setting(Base):
    __tablename__ = "settings"
    key: Mapped[str] = mapped_column(String(40), primary_key=True)
    value: Mapped[str] = mapped_column(String(100))
