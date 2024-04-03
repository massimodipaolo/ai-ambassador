import sys
import json
import uuid
import os.path

# read knowledgebase path from JSON input
input_data = json.loads(sys.argv[1])
knowledgebase_path = input_data["knowledgeBasePath"]

# ... real implementation will create here the db vector using all the knowledgebase files ...

# write db vector file
db_filename = "dummy_db_vector_{}.txt".format(str(uuid.uuid4()))
savePath = os.path.join(knowledgebase_path, db_filename)
with open(savePath, "w") as file:
  file.write("This is a dummy file.")

# Send the JSON output back to Node.js
output_data = {
  "dbVectorFilename": db_filename
}
sys.stdout.write(json.dumps(output_data))
sys.stdout.flush()
