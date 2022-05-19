# nodejs image
FROM node:14-alpine

# working directory
WORKDIR /app

# copy project files
COPY . .

# install dependencies
RUN npm install --only=prod

# export port
EXPOSE 8787

# run app
CMD ["npm", "run", "prod"]
