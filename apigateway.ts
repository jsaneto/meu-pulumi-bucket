import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

/**
 * Cria um API Gateway configurado com um endpoint de teste (Mock).
 * Esse tipo de configuração retorna uma resposta estática diretamente da AWS.
 */
export function createApiGateway() {
    // 1. Criar a API (RestApi)
    // Este é o container principal que agrupa todos os seus recursos, métodos e estágios.
    const api = new aws.apigateway.RestApi("minha-api", {
        description: "API de aprendizado com resposta Mock",
    });

    // 2. Criar o recurso /status
    // Define o caminho (path) da URL. Aqui estamos criando 'https://.../status'.
    const resource = new aws.apigateway.Resource("status-resource", {
        restApi: api.id,
        parentId: api.rootResourceId, // Define que este recurso está pendurado na raiz (/)
        pathPart: "status",           // A parte final da URL
    });

    // 3. Criar o Método GET
    // Define a operação HTTP que será permitida no recurso /status.
    const method = new aws.apigateway.Method("status-method", {
        restApi: api.id,
        resourceId: resource.id,
        httpMethod: "GET",
        authorization: "NONE", // Aberto ao público: sem necessidade de chaves ou tokens.
    });

    // 4. Configurar a Integração MOCK
    // O "Coração" do serviço. Em vez de chamar uma Lambda, a própria AWS simula o backend.
    const integration = new aws.apigateway.Integration("status-integration", {
        restApi: api.id,
        resourceId: resource.id,
        httpMethod: method.httpMethod,
        type: "MOCK", // Define que não há backend real, apenas uma simulação interna.
        requestTemplates: {
            // Mapeia o recebimento para que a AWS entenda que deve processar o código 200
            "application/json": "{\"statusCode\": 200}"
        },
    });

    // 5. Configurar a Resposta da Integração
    // Define o corpo (body) e o formato dos dados que a AWS devolverá quando o Mock for chamado.
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
    }, { dependsOn: [integration] }); // Só pode existir após a integração estar definida.

    // 6. Configurar a Resposta do Método
    // Define o contrato de resposta para o cliente final. Necessário para validar o status code 200.
    const methodResponse = new aws.apigateway.MethodResponse("status-method-response", {
        restApi: api.id,
        resourceId: resource.id,
        httpMethod: method.httpMethod,
        statusCode: "200",
    });

    // 7. Deploy e Stage
    // O Deployment publica as alterações; o Stage cria a URL acessível (ex: /dev).
    const deployment = new aws.apigateway.Deployment("api-deploy", {
        restApi: api.id,
    }, { dependsOn: [integration, response] }); // Garante que tudo esteja pronto antes de publicar.

    const stage = new aws.apigateway.Stage("dev", {
        restApi: api.id,
        deployment: deployment.id,
        stageName: "dev", // A URL final será: https://{api-id}.execute-api.{region}.amazonaws.com/dev/status
    });

    return stage;
}