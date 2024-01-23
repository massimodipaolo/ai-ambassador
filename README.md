# Sample basic

## Setup project

Create Vs solution & init git repo

### vs

```powershell
dotnet new sln --name ws-bom-sample-basic
dotnet sln add src/bowl src/mixer src/oven
```

### repo

```git
git init -b main
git add .
git commit -m "Init"
git remote add origin https://websolutespa@dev.azure.com/websolutespa/ws-bom-sample-basic/_git/ws-bom-sample-basic
git push -u origin --all
```

---

## Launch project

### serve

### docker stack

Check composer config & out dev/prod composer

```powershell
copy docker.env.sample docker.env.dev
copy docker.env.sample docker.env.prod
#edit docker.env.dev/prod 
docker compose --env-file docker.env.dev config
docker compose --env-file docker.env.dev config > docker-compose-dev.yml
docker compose --env-file docker.env.prod config > docker-compose-prod.yml
```

Ensure to have a package-lock.json to speed up building time

```powershell
npm i --package-lock-only
```

Build from compose & run locally

```powershell
$PROJECT="ws-bom-your-awesome-project"
$TAG="dev"
docker build --progress=plain -f ./src/bowl/Dockerfile -t $PROJECT-bowl:$TAG .
docker build --progress=plain -f ./src/oven/Dockerfile -t $PROJECT-oven:$TAG ./src/oven
docker build --progress=plain -f ./src/mixer/Dockerfile -t $PROJECT-mixer:$TAG .
docker compose --env-file docker.env.dev up --remove-orphans -d
#docker compose --env-file docker.env.local -f docker-compose-local.yml up --remove-orphans -d
#docker image prune
```

Tag/Push registry images

```powershell
$REGISTRY="wsdev.azurecr.io"
$PROJECT="ws-bom-your-awesome-project"
$TAG="main"
docker tag $PROJECT-bowl:$TAG $REGISTRY/$PROJECT-bowl:$TAG
docker tag $PROJECT-oven:$TAG $REGISTRY/$PROJECT-oven:$TAG
docker tag $PROJECT-mixer:$TAG $REGISTRY/$PROJECT-mixer:$TAG
#docker image prune
<# 
    .azure registry
    Ensure login succeded before push images:

az login
az acr login -n $REGISTRY
#>
docker push $REGISTRY/$PROJECT-bowl:$TAG
docker push $REGISTRY/$PROJECT-oven:$TAG
docker push $REGISTRY/$PROJECT-mixer:$TAG
<# 
    .azure registry
    Check azure registry images status:

az acr repository list --name $REGISTRY 
az acr repository show --name $REGISTRY --repository $PROJECT-bowl
#>
```

Azure multi-container app

```powershell
$PROJECT="ws-bom-sample-basic"
$RESOURCEGROUP="<WS-myEnv>"
$PLAN="<myAppServicePlan>"
<# 
    .service plan
    Create a new service plan if not exists: 

az appservice plan create --name $PLAN --resource-group $RESOURCEGROUP --sku S1 --is-linux
az appservice plan list
#>
az webapp create --resource-group $RESOURCEGROUP --plan $PLAN --name $PROJECT --multicontainer-config-type compose --multicontainer-config-file docker-compose-prod.yml
```

Enable Azure persistent volumes

```powershell
<#
    This enable ${WEBAPP_STORAGE_HOME} env var
#>
$PROJECT="ws-bom-sample-basic"
$RESOURCEGROUP="<WS-myEnv>"
az webapp config appsettings set --resource-group $RESOURCEGROUP --name $PROJECT --settings WEBSITES_ENABLE_APP_SERVICE_STORAGE=TRUE
```

In docker-compose prepend \${WEBAPP_STORAGE_HOME} to mount path

```yaml
    volumes:
      - ${WEBAPP_STORAGE_HOME}/data/mongo/dump:/data/dump
      - ${WEBAPP_STORAGE_HOME}/data/mongo/backup:/data/backup
```

Azure SSH session

```powershell
$SUBSCRIPTION="<xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx>"
$PROJECT="ws-bom-sample-basic"
$RESOURCEGROUP="<WS-myEnv>"
#ensure remote debugger is disabled
az webapp config set --resource-group $RESOURCEGROUP -n $PROJECT --remote-debugging-enabled=false 
az webapp create-remote-connection --subscription $SUBSCRIPTION --resource-group $RESOURCEGROUP -n $PROJECT
# ssh root@127.0.0.1 -p [local port created for TCP tunnel]
az webapp list-instances --name $PROJECT --resource-group $RESOURCEGROUP
az webapp ssh -n $PROJECT -g $RESOURCEGROUP
```

---
