import numpy as np, pandas as pd, sklearn
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LinearRegression
from sklearn.cluster import KMeans
from sklearn.metrics import (accuracy_score, precision_recall_fscore_support, confusion_matrix,
                             mean_absolute_error, mean_squared_error, r2_score, silhouette_score)
VERSION = f"scikit-learn {sklearn.__version__}"
is_num = pd.api.types.is_numeric_dtype
def auto(df, target): return [c for c in df.columns if is_num(df[c]) and c != target]
def check(df, approach, target, feats=None):
    tg = target if approach != "uns" else None
    if approach != "uns":
        if target not in df.columns: return "La variable objetivo no existe en el dataset."
        t = df[target]
        if approach == "clf" and is_num(t) and t.nunique() > 10: return "Clasificación exige un objetivo categórico."
        if approach == "reg" and not (is_num(t) and t.nunique() > 10): return "Regresión exige un objetivo numérico continuo."
    f = feats or auto(df, tg)
    bad = [c for c in f if c not in df.columns or not is_num(df[c]) or c == tg]
    if bad: return "Variables de entrada no válidas (deben ser numéricas y distintas del objetivo): " + ", ".join(bad)
    if len(f) < (2 if approach == "uns" else 1): return "No hay suficientes variables numéricas de entrada."
def run(df, approach, target, feats=None):
    tg = target if approach != "uns" else None
    f = feats or auto(df, tg)
    d = df[f + ([target] if tg else [])].dropna()
    warn = [f"{len(df)-len(d)} filas con faltantes fueron excluidas."] if len(d) < len(df) else []
    excl = [c for c in df.columns if c not in f and c != tg]
    X = d[f]; base = {"features": f, "excluded": excl}
    if approach == "uns":
        Z = StandardScaler().fit_transform(X); km = KMeans(3, n_init=10, random_state=42).fit(Z)
        return {**base, "algorithm": "KMeans (k=3)", "warnings": warn + ["Los grupos describen patrones; no son categorías verdaderas."],
                "metrics": {"grupos": 3, "tamaños": np.bincount(km.labels_).tolist(), "silhouette": round(float(silhouette_score(Z, km.labels_)), 3)}}
    y = d[target].astype(str) if approach == "clf" else d[target]
    Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=0.3, random_state=42)
    if approach == "clf":
        p = RandomForestClassifier(100, random_state=42).fit(Xtr, ytr).predict(Xte)
        pr, rc, f1, _ = precision_recall_fscore_support(yte, p, average="weighted", zero_division=0)
        lab = sorted(set(yte) | set(p))
        return {**base, "algorithm": "RandomForest (100 árboles)", "split": "70/30 · semilla 42",
                "warnings": warn + ["Con clases desbalanceadas, accuracy puede engañar: revise la matriz."],
                "metrics": {"accuracy": round(accuracy_score(yte, p), 3), "precisión": round(pr, 3), "recall": round(rc, 3), "F1": round(f1, 3),
                            "matriz_confusion": {"labels": lab, "matrix": confusion_matrix(yte, p, labels=lab).tolist()}}}
    p = LinearRegression().fit(Xtr, ytr).predict(Xte)
    return {**base, "algorithm": "Regresión lineal múltiple", "split": "70/30 · semilla 42", "warnings": warn,
            "metrics": {"MAE": round(mean_absolute_error(yte, p), 2), "RMSE": round(float(np.sqrt(mean_squared_error(yte, p))), 2), "R2": round(r2_score(yte, p), 3)}}
