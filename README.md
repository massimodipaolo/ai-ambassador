# ws-ai-ambassador

## 📄 setup

Create .env.local/.env.docker file in ./src/bowl/payload, replacing the following keys:

```powershell
MONGODB_URI=***
PAYLOAD_SECRET=***
AZURE_STORAGE_CONNECTION_STRING=***
AZURE_STORAGE_CONTAINER_NAME=***
AZURE_STORAGE_ACCOUNT_BASEURL***
```

## 🚀 dev

```powershell
#install
npm i
#build
npm run build:bowl
#start
npm run serve:bowl
```

## 🐳 docker

```powershell
#build
docker build --progress=plain -f ./src/bowl/Dockerfile-py -t ws-ai-ambassador-bowl:py  .
#test
docker run --hostname=ws-ai-ambassador --name=ws-ai-ambassador --env-file ./src/bowl/payload/.env.docker -p 4000:4000 -d ws-ai-ambassador-bowl:py
```

## 🚢 deploy

```powershell
docker tag ws-ai-ambassador-bowl:py wsaicr.azurecr.io/ws-ai-ambassador-bowl:py
#interactive login
az login
az acr login --name wsaicr
#push
docker push wsaicr.azurecr.io/ws-ai-ambassador-bowl:py
```

## 🌐 publish

```powershell
#interactive login
az login
#check app
az webapp list --subscription "Websolute - AI" -g ws-ambassador-rg -o table
#restart app
az webapp restart --subscription "Websolute - AI" -g ws-ambassador-rg -n ws-ai-ambassador-bowl
```
