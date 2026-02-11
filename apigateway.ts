import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

export function createApiGateway() {
    // 1. Criar a API
    const api = new aws.apigateway.RestApi("minha-api", {
        description: "API de aprendizado com resposta Mock",
    });

    // 2. Criar o recurso /status
    const resource = new aws.apigateway.Resource("status-resource", {
        restApi: api.id,
        parentId: api.rootResourceId,
        pathPart: "status",
    });

    // 3. Criar o Método GET
    const method = new aws.apigateway.Method("status-method", {
        restApi: api.id,
        resourceId: resource.id,
        httpMethod: "GET",
        authorization: "NONE",
    });

    // 4. Configurar a Integração MOCK (O "Coração" da resposta sem Lambda)
    const integration = new aws.apigateway.Integration("status-integration", {
        restApi: api.id,
        resourceId: resource.id,
        httpMethod: method.httpMethod,
        type: "MOCK",
        requestTemplates: {
            "application/json": "{\"statusCode\": 200}"
        },
    });

    // 5. Configurar a Resposta da Integração (O que a AWS devolve)
    const response = new aws.apigateway.IntegrationResponse("status-response", {
        restApi: api.id,
        resourceId: resource.id,
        httpMethod: method.httpMethod,
        statusCode: "200",
        responseTemplates: {
            "application/json": JSON.stringify({
                message: "API Gateway Mock funcionando!",
                autor: "Jose Neto"
            }),
        },
    }, { dependsOn: [integration] });

    // 6. Configurar a Resposta do Método (Necessário para o modelo REST)
    const methodResponse = new aws.apigateway.MethodResponse("status-method-response", {
        restApi: api.id,
        resourceId: resource.id,
        httpMethod: method.httpMethod,
        statusCode: "200",
    });

    // 7. Deploy e Stage
    const deployment = new aws.apigateway.Deployment("api-deploy", {
        restApi: api.id,
    }, { dependsOn: [integration, response] });

    const stage = new aws.apigateway.Stage("dev", {
        restApi: api.id,
        deployment: deployment.id,
        stageName: "dev",
    });

    return stage;
}