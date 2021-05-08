# Simplify your lambda development with layers

As I was getting into cloud development, and while still trying to figure out the best and fastest way to get my code tested and deployed, I learned about Lambda Layers.

Originally, the main satisfaction they provided was enabling me to see the Lambda code directly in the AWS Console, as they extracted away from the dependencies I am using, which made my lambda code smaller as it should be. This enabled me to debug and change my own written lambda code from the console directly (Don't do this in a prod environment, it's not a good practice) - later I learned how to better debug and test my lambda locally with the help of [SAM](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/what-is-sam.html) and sometimes [Localstack](https://github.com/localstack/localstack).

That was a side effect of the Lambda Layer usage and not the purpose. This post will go over a couple of benefits of using Layers, where we will build a lambda with a layer together.

The main goals of using layers are:

- Reducing the size of the Lambda deployment package, which makes the deployment faster
- Sharing code across multiple lambdas (e.g. packages, binaries, etc.)

For the sake of demonstrating these use cases, I will use a large JS library [momentjs](https://momentjs.com/docs/) as a dependency in my lambda (Note the docs of momentjs recommend not using it whenever possible - from their docs: `We now generally consider Moment to be a legacy project in maintenance mode. It is not dead, but it is indeed done.`).

## Create Lambda Without Layers

Our lambda will simply take a date and formats it (2021-05-09 => 09 May 2021)

- Run the following command to initialize the serverless application: `sam init` - of course, you would need to have the [SAM CLI installed](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-sam-cli-install.html) on your machine. Once done, you will get prompted with a few questions. Choose NodeJS as a runtime, add a project name, and select the "Hello World" template".

- Update the template.yml to reflect the proper values - mainly changing the name from hello-world to date-formatter, deleting the "Events" property of the lambda as we are not looking to trigger it through API Gateway or other means (we'll trigger it manually), and deleting the Outputs as we're not going to need them. The template.yml will look as follows:

  ```
  AWSTemplateFormatVersion: '2010-09-09'
  Transform: AWS::Serverless-2016-10-31
  Description: date-formatter

  Resources:
  DateFormatterFunction:
      Type: AWS::Serverless::Function
      Properties:
      CodeUri: src/
      Handler: app.lambdaHandler
      Runtime: nodejs12.x
      FunctionName: date-formatter

  ```

- In the generated folders and files, change the "hello-world" folder name to be "src" to match the CodeUri added in the template.yml.
- Inside the "src" folder, run `npm i moment`
- Update the app.js file as follows:

  ```
  const moment = require(monent);
  exports.lambdaHandler = async (event, context) => {
      try {
          const { date } = event;
          const formattedDate = moment(date).format('DD MMM YYYY');
          onsole.log(formattedDate);
      } catch (err) {
      console.log(err);
      }
  };

  ```

* Deploy the app: `sam deploy --guided`. You will be prompted with a few questions
  ```
      Setting default arguments for 'sam deploy'
      =========================================
      Stack Name [sam-app]: lambda-layer-demo
      AWS Region [us-east-1]:
      #Shows you resources changes to be deployed and require a 'Y' to initiate deploy
      Confirm changes before deploy [y/N]:
      #SAM needs permission to be able to create roles to connect to the resources in your template
      Allow SAM CLI IAM role creation [Y/n]: Y
      Save arguments to configuration file [Y/n]: Y
      SAM configuration file [samconfig.toml]:
      SAM configuration environment [default]:
  ```
* Open your console and test the lambda - you might have an information box under "Code source" showing "The deployment package of your Lambda function is too large to enable inline code editing. However, you can still invoke your function." - What is more important is the size of the lambda, which shows under "Code properties" - the **Package size shows 1.1 MB**. It also took 32 seconds to get that code uploaded and deployed on my fiber connection.

## Introduce a Layer to our Lambda

As per the [AWS documentation](https://docs.aws.amazon.com/lambda/latest/dg/configuration-layers.html#invocation-layers-cloudformation), a Lambda layer is a .zip file archive that can contain additional code or data. A layer can contain libraries, a custom runtime, data, or configuration files. Layers promote code sharing and separation of responsibilities so that you can iterate faster on writing business logic.

We will now bundle momentjs in a layer, and then we could use it within our Lambda:

- Create a new folder next to the "month-formatter" folder: `cd .. && mkdir ./layer/nodejs`
- In the layer/nodejs folder, run `npm init`, then `npm i moment` - This will initialise the npm package and installs momentjs
- Back to the template.yml file Add the following resource

  ```
  Momentlayer:
    Type: AWS::Serverless::LayerVersion
    Properties:
      LayerName: moment-layer-2-29-1
      Description: Moment layer 2.29.1
      ContentUri: ../layer
      CompatibleRuntimes:
        - nodejs12.x
  ```

* Run `sam deploy` to deploy the sam template and create the layer
* Once done, navigate to the AWS console, and look under "Layers" to find the newly created layer. Or simply, run `aws lambda list-layers` in your command line

That's awesome. Now, it's time to add the layer to our lambda.

Note that the layer has to be created under the nodejs/node_modules path according to the [AWS documentation](https://docs.aws.amazon.com/lambda/latest/dg/configuration-layers.html) unless you'd like to specify the runtime PATH yourself. In our example, we have the node_modules under the nodejs folder, and the "ContentUri" property in the template file points to that folder.

That's awesome. Navigate to the lambda in your AWS Console, test it by passing a JSON object that has a "date" property, and verify the date is printed according to the DD Month YYYY format.

## Should we use Layers?

If we look at our lambda size, the **Package size shows 277.0 bytes** instead of 1.1MB before moving to another layer.
Assume we need to reuse that code (in our example, it's momentjs) in another lambda, we could now just reference the layer. Great way to share code across lambda functions.

The usage of layers comes with a couple of disadvantages though:

- Testing the lambda becomes a bit more complex as the content of the layer is needed during the execution of the unit and integration tests.
- Usage of layers with static languages (e.g. Java, C#) as they require the dependencies alongside the application code during the compilation.

It is worth weighing the benefits of layers with the complexity they introduce to your process. Usually, a good use case would be sharing a large code base across multiple functions (our example above is not a good use case to use Layers, but just a simple way to demonstrate their usage).

I hope you liked the post and looking forward to getting your feedback.

Project code can be found at: https://github.com/AHaydar/lambda-layer
