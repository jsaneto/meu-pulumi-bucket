import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

/**
 * Cria e configura um Application Load Balancer (ALB).
 * param vpcId O ID da rede (VPC) onde o balanceador operará.
 * param subnetIds Lista de subnets (mínimo 2 em AZs diferentes para ALBs públicos).
 * param securityGroupId O grupo de segurança que permite tráfego na porta 80.
 */
export const createLoadBalancer = (
    vpcId: pulumi.Input<string>, 
    subnetIds: pulumi.Input<string[]>, 
    securityGroupId: pulumi.Input<string>
) => {
    
    // 1. O Recurso do Load Balancer (ALB)
    const alb = new aws.lb.LoadBalancer("app-lb", {
        internal: false, // Define como 'false' para ser acessível via Internet
        loadBalancerType: "application", // Tipo L7 (conhece protocolos como HTTP/HTTPS)
        // O Pulumi gerencia as dependências desses IDs automaticamente
        securityGroups: [securityGroupId], 
        subnets: subnetIds,
    });

    // 2. Target Group (Grupo de Destino)
    // É aqui que as instâncias do Auto Scaling Group serão "penduradas"
    const targetGroup = new aws.lb.TargetGroup("app-tg", {
        port: 80, // Porta onde a aplicação (Apache) está rodando nas instâncias
        protocol: "HTTP",
        vpcId: vpcId,
        targetType: "instance", // O destino final são instâncias EC2
        
        // Configuração de Health Check (Verificação de Saúde)
        healthCheck: {
            path: "/", // O ALB tentará acessar a raiz do site para ver se está online
            port: "traffic-port",
            healthyThreshold: 2, // Precisa de 2 sucessos para considerar a instância "viva"
            unhealthyThreshold: 2, // 2 falhas removem a instância do rodízio
            timeout: 5, // Espera até 5 segundos por resposta
            interval: 30, // Verifica a cada 30 segundos
        },
    }, { dependsOn: [alb] }); // Boa prática: Garante que o ALB exista antes de criar o TG

    // 3. Listener (Ouvinte)
    // Fica escutando a porta 80 do Load Balancer e decide o que fazer com a requisição
    const listener = new aws.lb.Listener("app-listener", {
        loadBalancerArn: alb.arn, // Conecta este ouvinte ao ALB criado acima
        port: 80,
        defaultActions: [{
            type: "forward", // Ação padrão: Encaminhar o tráfego
            targetGroupArn: targetGroup.arn, // Envia para o Target Group definido acima
        }],
    });

    // Retornamos os dados necessários para o Auto Scaling Group e para o Output do terminal
    return {
        targetGroupArn: targetGroup.arn,
        albDnsName: alb.dnsName, // Este é o endereço (URL) que você usará no navegador
    };
};