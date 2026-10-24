"""Datasets and ML models that are loaded once when the backend starts."""
from learning_dna.services.automl_service import build_learning_models
from learning_dna.services.llm_tutor_service import load_dataset_registry
from learning_dna.services.real_data_service import load_learning_dataset, load_optional_heart_dataset

LEARNING_DF, DATA_INFO = load_learning_dataset()
HEART_DF = load_optional_heart_dataset()
MODEL_BUNDLE = build_learning_models(LEARNING_DF)
DATASET_REGISTRY_DF = load_dataset_registry()
