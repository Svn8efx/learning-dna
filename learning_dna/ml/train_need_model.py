"""Train and save the TensorFlow learning-need classifier:  python -m learning_dna.ml.train_need_model"""
from learning_dna.ml.need_model import NeedClassifier

if __name__ == "__main__":
    metrics = NeedClassifier().train()
    print("Saved model to models/need_classifier.keras")
    for key, value in metrics.items():
        print(f"  {key}: {value}")
