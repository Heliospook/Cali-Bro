FROM python:3.12-slim
RUN apt-get update && apt-get install -y \
       libgl1-mesa-glx \
       libglib2.0-0 \
       libsm6 \
       libxext6 \
       libxrender-dev 
WORKDIR /app
COPY . /app
RUN pip install -r requirements.txt
EXPOSE 5000
CMD ["python", "app.py"]
