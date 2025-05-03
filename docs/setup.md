# Setup and Installation

This guide will walk you through setting up and installing Phlox.

## Prerequisites

Before you begin, ensure you have the following prerequisites installed and configured:

1.  **Podman or Docker:**  Phlox uses containerization for easy deployment. Install either [Podman](https://podman.io/) or [Docker](https://www.docker.com/).

2.  **Ollama Instance:** Phlox relies on Ollama to run Large Language Models. You need a running Ollama instance, either:
    - **Locally:** [Install Ollama](https://ollama.com/) on your machine and ensure it's running. You'll likely want to pull models like `llama3.3`, `mistral`, or similar using `ollama pull <model_name>`. Recommended models:
      - **Standard Hardware:** Use `llama3:8b` (smaller, faster, suitable for most systems)
      - **Performance-Optimized:** Bigger models like `llama3:70b` will provide better results but at the expense of speed. They are only practical for powerful machines with lots of VRAM.
    - **Remotely:** If you have a remote server with Ollama running, you can configure Phlox to connect to it.

3.  **Whisper-compatible Transcription Service:** Phlox needs a service to transcribe audio into text. You have a few options:
    - **Speaches (Self-hosted, Recommended for Local):** [Speaches](https://github.com/speaches-ai/speaches) is a self-hostable, open-source Whisper server.
      - Recommended model: `Systran/faster-distil-whisper-medium.en` ( smaller and faster but still accurate)
      - Follow their instructions to set up an instance. This is recommended for local, privacy-focused setups.
    - **Cloud-based Whisper API:**
      - If you are using the official OpenAI Whisper endpoint you must specify `whisper-1` as the model.
      - Ensure you understand their privacy and cost implications.
      - You'll need to configure Phlox with the API endpoint and necessary credentials.

4.  **Hardware Considerations:**
    - **For best performance:** A GPU (CUDA, ROCm) or Apple M-Series chip is strongly recommended
    - **Without GPU/Apple silicon:** The system will run but will be unusably slow, especially with larger models
    - **RAM Requirements:**
      - 8GB minimum for smaller models
      - 16GB+ recommended for better performance
      - 32GB+ for large models like llama3:70b

## Quick Start Instructions

Follow these steps for a quick installation:

1.  **Clone the Repository:**
    ```bash
    git clone https://github.com/bloodworks-io/phlox.git
    cd phlox
    ```

2.  **Build the Docker Image:**
    ```bash
    docker build -t phlox:latest .
    ```

3.  **Create `.env` File:**
    Create a file named `.env` within the cloned respository and add the following content, **customizing the values** as needed:

    ```env
    # Required
    DB_ENCRYPTION_KEY=your_very_secret_key_here  # Generate a strong, random key!
    TZ=Australia/Melbourne  # Set your Timezone (e.g., America/New_York)
    ```

4.  **Run Phlox:**

    - **Production Deployment:** Use the `docker-compose.yml` file:
        ```bash
        docker-compose up
        ```

    - **Development Setup:** Use the `docker-compose.dev.yml` file:
        ```bash
        docker-compose -f docker-compose.dev.yml up
        ```


5.  **Access Phlox in your Browser:**
    Open your web browser and navigate to [http://localhost:3000](http://localhost:5000).

6.  **Initial Configuration:**
    Once Phlox is running, access the **Settings** page within the application:
    - **Ollama Endpoint:**  Verify or update the Ollama API URL if needed.
    - **Transcription Endpoint:** **Ensure the Whisper API URL is correctly configured to match your transcription service.** Test the connection if possible. Depending on your endpoint configuration, you may need to specify a model and an API-key.
    - **Model Selection:**  Model selection options will depend on the models available in your Ollama instance.
    - **Other Settings:** Your name and specialty are provided as context during many LLM calls. This can improve the output of the LLM.

## Post-Installation Notes

-   **Data Persistence:**  Your application data (database, ChromaDB data) is stored in the `./data` directory relative to your `docker-compose.yml` file.
-   **HTTPS for Browser Recording:**  To use the browser-based audio recording feature, you will need a secure context (HTTPS). For local development with `localhost`, most browsers allow exceptions for microphone access over `http://localhost`, but for any other network access, you'll need HTTPS. Consider setting up a reverse proxy with SSL termination (e.g., using Caddy or Nginx) if you need HTTPS access.


If you encounter further issues, please create an issue on the [GitHub repository](https://github.com/bloodworks-io/phlox/issues).
