"""Learning DNA backend entry point:  python app.py"""
import logging

from learning_dna import create_app

logging.basicConfig(level=logging.INFO)
app = create_app()

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=False, use_reloader=False)
