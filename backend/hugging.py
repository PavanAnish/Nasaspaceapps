from huggingface_hub import login, HfApi, upload_file, create_repo
import os

# Get token from environment variable (more secure)
hf_token = os.getenv("HF_TOKEN")
if not hf_token:
    raise ValueError("HF_TOKEN environment variable not set. Please set it before running this script.")

login(token=hf_token)
repo_id = "AB1N05/Nasamode"
api = HfApi()
try:
    api.create_repo(repo_id=repo_id, repo_type="model", private=False)
except Exception as e:
    print("repo may exist:", e)

files = ["exoplanet_xgb.joblib", "README.md", "requirements.txt"]
for f in files:
    upload_file(path_or_fileobj=f, path_in_repo=os.path.basename(f), repo_id=repo_id, repo_type="model")
print("Uploaded to HF model hub.")
