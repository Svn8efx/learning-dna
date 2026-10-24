"""Plain-language lesson text for every topic in the catalog.

Written for the Learning DNA accessible-content module: short sentences, no reliance on images,
so the text works with screen readers, text-to-speech and as a transcript alternative to video.
Each entry: (overview, [key points]).
"""

LESSONS = {
    "python": (
        "Python is a beginner-friendly programming language. Most machine learning tools are written for it.",
        ["Variables store values such as numbers and text.",
         "Lists and dictionaries group many values together.",
         "Functions let you reuse code instead of repeating it.",
         "Libraries such as NumPy and Pandas handle numbers and tables."]),
    "data preprocessing": (
        "Real data is messy. Preprocessing cleans it so that a model can learn from it.",
        ["Fill in or remove missing values.",
         "Convert text categories into numbers.",
         "Scale numbers so that large values do not dominate small ones.",
         "Split the data into a training part and a testing part."]),
    "linear regression": (
        "Linear regression predicts a number by drawing the best straight line through the data.",
        ["The line is described by a slope and an intercept.",
         "Training finds the values that make the prediction errors smallest.",
         "Mean squared error measures how far predictions are from the truth.",
         "It works best when the relationship is roughly a straight line."]),
    "classification": (
        "Classification predicts a category, such as spam or not spam.",
        ["The model learns from examples that already have labels.",
         "Logistic regression and k-nearest neighbours are common starting points.",
         "Accuracy shows how often the model is right.",
         "A confusion matrix shows which categories get mixed up."]),
    "decision trees": (
        "A decision tree makes a prediction by asking a series of yes or no questions.",
        ["Each question splits the data into smaller groups.",
         "The tree stops when the groups are pure or small enough.",
         "Trees are easy to explain because you can follow the questions.",
         "A tree that grows too deep memorises the data, which is called overfitting."]),
    "clustering": (
        "Clustering groups similar items together without being told the right answer.",
        ["It is a form of unsupervised learning, so there are no labels.",
         "K-means picks a number of groups and moves their centres until they settle.",
         "You choose the number of groups, often by trying several values.",
         "It is useful for finding customer or student segments."]),
    "dimensionality reduction": (
        "Dimensionality reduction shrinks a dataset with many columns into fewer columns while keeping the important patterns.",
        ["Fewer columns make models faster and easier to visualise.",
         "Principal component analysis finds the directions with the most variation.",
         "Some information is always lost, so check what you keep.",
         "It is often used before clustering or plotting."]),
    "naive bayes": (
        "Naive Bayes is a fast classifier based on probability and Bayes' rule.",
        ["It assumes each feature contributes independently, which is the naive part.",
         "It works well for text such as spam filtering.",
         "Training is very quick, even on large data.",
         "Its probabilities can be rough, but its rankings are often good."]),
    "neural networks": (
        "A neural network is a stack of simple connected units that learn patterns from examples.",
        ["Each unit multiplies its inputs by weights and adds them up.",
         "Activation functions let the network learn curved patterns.",
         "Training adjusts the weights step by step to reduce errors.",
         "Deep networks have many layers and need more data."]),
    "automl": (
        "AutoML tries many models and settings automatically and picks the one that performs best.",
        ["It saves time on repeated trial and error.",
         "It compares models on data the models did not train on.",
         "You still need to check the data quality yourself.",
         "The chosen model should still be tested before real use."]),
    "statistics": (
        "Statistics is the science of describing data and judging how reliable conclusions are.",
        ["The mean, median and mode describe the centre of the data.",
         "Standard deviation describes how spread out the data is.",
         "A sample is a small group used to learn about a larger group.",
         "Correlation does not prove that one thing causes another."]),
    "probability": (
        "Probability measures how likely something is, on a scale from zero to one.",
        ["Zero means impossible and one means certain.",
         "Independent events do not affect each other.",
         "Conditional probability asks how likely A is, given that B happened.",
         "Many machine learning models output probabilities."]),
    "feature engineering": (
        "Feature engineering means creating better input columns so that a model can learn more easily.",
        ["Combine columns, for example height and weight into body mass index.",
         "Turn dates into useful parts such as day of the week.",
         "Remove columns that add noise.",
         "Good features often help more than a fancier model."]),
    "model evaluation": (
        "Model evaluation checks how well a model will work on new data.",
        ["Always test on data the model has not seen.",
         "Precision and recall describe different kinds of mistakes.",
         "Cross-validation repeats the test on several splits for a steadier result.",
         "A high training score with a low test score means overfitting."]),
    "computer vision": (
        "Computer vision teaches computers to understand images and video.",
        ["Images are grids of numbers, one for each pixel.",
         "Convolutional networks scan an image for edges, shapes and objects.",
         "Common tasks are image classification and object detection.",
         "Training needs many labelled images."]),
    "nlp": (
        "Natural language processing lets computers work with human language.",
        ["Text is split into tokens such as words or word pieces.",
         "Words are turned into numbers called embeddings.",
         "Tasks include translation, sentiment analysis and question answering.",
         "Context matters, because the same word can mean different things."]),
    "transformers": (
        "Transformers are neural networks that use attention to decide which words in a sentence matter most to each other.",
        ["Attention lets every word look at every other word.",
         "They process a whole sentence at once, which makes training fast.",
         "Most modern language models are built on transformers.",
         "They need a lot of data and computing power."]),
    "llm": (
        "A large language model is a transformer trained on huge amounts of text to predict the next word.",
        ["By predicting words, it learns grammar, facts and writing styles.",
         "It can write, summarise and answer questions.",
         "It can also be wrong and sound confident, so check important answers.",
         "Fine-tuning adapts a general model to a specific job."]),
    "prompt engineering": (
        "Prompt engineering is the skill of writing clear instructions that get useful answers from a language model.",
        ["State the task, the audience and the format you want.",
         "Give an example of a good answer.",
         "Break big tasks into smaller steps.",
         "Test and improve your prompt, as small changes can matter."]),
    "generative ai": (
        "Generative AI creates new content such as text, images, audio and code.",
        ["Models learn patterns from existing examples and produce new ones.",
         "Diffusion models and transformers are two common approaches.",
         "Outputs can contain mistakes or bias.",
         "Think about copyright and honesty when you use generated content."]),
    "reinforcement learning": (
        "In reinforcement learning an agent learns by trying actions and receiving rewards.",
        ["The agent observes a state and chooses an action.",
         "The environment gives back a reward and a new state.",
         "The goal is to collect as much total reward as possible.",
         "It is used in games, robotics and recommendation systems."]),
    "model deployment": (
        "Deployment means making a trained model available so that people or other programs can use it.",
        ["Save the trained model to a file.",
         "Wrap it in a small web service, for example with Flask.",
         "Monitor it, because real-world data changes over time.",
         "Plan how to update the model safely."]),
    "svm": (
        "A support vector machine separates classes by finding the widest possible gap between them.",
        ["The points closest to the gap are called support vectors.",
         "A wide gap usually means better results on new data.",
         "Kernels let it handle curved boundaries.",
         "It works well on small and medium sized datasets."]),
    "ensemble methods": (
        "Ensemble methods combine many models so that the group is more accurate than any single model.",
        ["Bagging trains models on different random samples, as in random forests.",
         "Boosting trains models one after another, each fixing earlier mistakes.",
         "Voting combines the answers of different models.",
         "They are strong choices for table-shaped data."]),
    "hyperparameter tuning": (
        "Hyperparameters are settings you choose before training, such as tree depth or learning rate. Tuning finds good values.",
        ["Grid search tries every combination from a list.",
         "Random search tries random combinations and is often faster.",
         "Always tune using validation data, not test data.",
         "More tuning has diminishing returns."]),
    "search algorithms": (
        "Search algorithms help a program find a path or an answer in a large set of possibilities.",
        ["Breadth-first search explores level by level.",
         "Depth-first search follows one path as far as it goes.",
         "A-star search uses an estimate to head towards the goal.",
         "They are used in route finding and games."]),
    "knowledge representation": (
        "Knowledge representation is how an AI system stores facts and rules so that it can reason with them.",
        ["Facts and rules can be written in logic.",
         "Semantic networks link ideas with labelled connections.",
         "Ontologies define the kinds of things in a subject area.",
         "Clear structure makes reasoning explainable."]),
    "expert systems": (
        "An expert system copies the decisions of a human expert using a set of if-then rules.",
        ["A knowledge base holds the rules.",
         "An inference engine applies the rules to the facts.",
         "They can explain which rules led to an answer.",
         "They are hard to maintain when rules grow very large."]),
    "fuzzy logic": (
        "Fuzzy logic handles ideas that are not simply true or false, such as warm or fairly tall.",
        ["Membership values run from zero to one.",
         "Rules use words like low, medium and high.",
         "It is used in control systems such as washing machines.",
         "It gives smooth decisions instead of sudden jumps."]),
    "rag": (
        "Retrieval-augmented generation lets a language model look up documents before it answers.",
        ["First, search a collection of documents for relevant passages.",
         "Then, give those passages to the language model with the question.",
         "This reduces made-up answers and lets you cite sources.",
         "The quality of the search decides the quality of the answer."]),
}
