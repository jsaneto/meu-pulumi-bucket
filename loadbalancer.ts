import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

export const createLoadBalancer = (
    vpcId: pulumi.Input<string>, 
    subnetIds: pulumi.Input<string[]>, 
    securityGroupId: pulumi.Input<string>
) => {
    
    const alb = new aws.lb.LoadBalancer("app-lb", {
        internal: false,
        loadBalancerType: "application",
        // Passamos o Input diretamente, o Pulumi gerencia a dependência
        securityGroups: [securityGroupId], 
        subnets: subnetIds,
    });

    const targetGroup = new aws.lb.TargetGroup("app-tg", {
        port: 80,
        protocol: "HTTP",
        vpcId: vpcId,
        targetType: "instance",
        healthCheck: {
            path: "/",
            port: "traffic-port",
            healthyThreshold: 2,
            unhealthyThreshold: 2,
            timeout: 5,
            interval: 30,
        },
    }, { dependsOn: [alb] }); // Garantimos que o TG espere o ALB

    const listener = new aws.lb.Listener("app-listener", {
        loadBalancerArn: alb.arn, // Aqui o Pulumi cria o elo de dependência
        port: 80,
        defaultActions: [{
            type: "forward",
            targetGroupArn: targetGroup.arn,
        }],
    });

    return {
        targetGroupArn: targetGroup.arn,
        albDnsName: alb.dnsName,
    };
};