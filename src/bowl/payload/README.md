# Bowl Payload Template

### Running locally

To run this project you'll need the following software:

- Yarn or NPM
- NodeJS version 10+
- A Mongo Database - **IMPORTANT: you need to either have MongoDB running locally, or have signed up for a free MongoDB Atlas server in order to test this repo locally.**

##### Local installation steps:

**Clone the repo by running the following command at your terminal:**

```bash
git clone git@github.com/manuelebagnolini/bowl-payload.git
```

**Navigate to folder and install dependencies**

Type `cd ./bowl-payload` and then `yarn` or `npm install --legacy-peer-deps` to add all required dependencies.

**Edit `.env` file and fill in your own values**

Typically, the only line that you'll need to change within your new `.env` for local development is the `MONGO_URL` value.

**Fire up the development server**

Finally, type `yarn dev` to start up the server and see it in action!

> **_NOTE:_**: default admin credentials are:
>
> - _email_: `admin@bowl-payload.com`
> - _password_: `admin`
