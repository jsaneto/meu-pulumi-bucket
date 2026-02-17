import * as aws from "@pulumi/aws";
import * as eks from "@pulumi/eks";
import * as k8s from "@pulumi/kubernetes";
import * as pulumi from "@pulumi/pulumi";

export function createK8sCluster() {
    // 1. Descoberta Automática da Rede Padrão
    const defaultVpc = aws.ec2.getVpc({ default: true });
    
    // Filtramos as sub-redes da VPC padrão
    const defaultSubnets = defaultVpc.then(vpc => 
        aws.ec2.getSubnets({ 
            filters: [{ name: "vpc-id", values: [vpc.id] }] 
        })
    );

    // 2. Criação do Cluster EKS
    const cluster = new eks.Cluster("meu-cluster-eks", {
        // Passamos os IDs descobertos dinamicamente
        vpcId: defaultVpc.then(vpc => vpc.id),
        publicSubnetIds: defaultSubnets.then(s => s.ids),
        
        // Configurações otimizadas para ACG Sandbox
        desiredCapacity: 2,
        minSize: 1,
        maxSize: 2,
        instanceType: "t3.medium", 
        version: "1.29",
        
        // O nodeGroup automático usará essas configurações
        nodeAssociatePublicIpAddress: true,
    });

    // 3. Deployment do Nginx (Kubernetes Resource)
    const appLabels = { app: "nginx-k8s" };
    const deployment = new k8s.apps.v1.Deployment("nginx-dep", {
        spec: {
            selector: { matchLabels: appLabels },
            replicas: 1,
            template: {
                metadata: { labels: appLabels },
                spec: {
                    containers: [{
                        name: "nginx",
                        image: "nginx:latest",
                        ports: [{ containerPort: 80 }],
                    }],
                },
            },
        },
    }, { provider: cluster.provider });

    // 4. Service LoadBalancer para expor o App
    const service = new k8s.core.v1.Service("nginx-svc", {
        spec: {
            type: "LoadBalancer",
            ports: [{ port: 80, targetPort: 80 }],
            selector: appLabels,
        },
    }, { provider: cluster.provider });

    // 5. Tratamento do endpoint para evitar erros de "undefined" antes do deploy
    const endpoint = service.status.loadBalancer.ingress[0].hostname;

    return {
        clusterName: cluster.eksCluster.name,
        kubeconfig: cluster.kubeconfig,
        endpoint: endpoint,
    };
}