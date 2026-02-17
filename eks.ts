import * as aws from "@pulumi/aws";
import * as eks from "@pulumi/eks";
import * as k8s from "@pulumi/kubernetes";
import * as pulumi from "@pulumi/pulumi";

export function createK8sCluster() {
    // 1. Descoberta da VPC padrão
    const defaultVpc = aws.ec2.getVpc({ default: true });
    
    // 2. Filtramos as sub-redes, mas EXCLUÍMOS a us-east-1e
    const filteredSubnets = defaultVpc.then(vpc => 
        aws.ec2.getSubnets({ 
            filters: [
                { name: "vpc-id", values: [vpc.id] },
                // Este filtro garante que não pegamos a zona problemática
                { name: "availability-zone", values: ["us-east-1a", "us-east-1b", "us-east-1c", "us-east-1d"] }
            ] 
        })
    );

    // 3. Criação do Cluster EKS
    const cluster = new eks.Cluster("meu-cluster-eks", {
        vpcId: defaultVpc.then(vpc => vpc.id),
        // Usamos apenas as sub-redes filtradas
        publicSubnetIds: filteredSubnets.then(s => s.ids),
        
        desiredCapacity: 2,
        minSize: 1,
        maxSize: 2,
        instanceType: "t3.medium", 
        version: "1.29",
        nodeAssociatePublicIpAddress: true,
    });

    // --- Restante do código (Deployment e Service) continua igual ---
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

    const service = new k8s.core.v1.Service("nginx-svc", {
        spec: {
            type: "LoadBalancer",
            ports: [{ port: 80, targetPort: 80 }],
            selector: appLabels,
        },
    }, { provider: cluster.provider });

    return {
        clusterName: cluster.eksCluster.name,
        kubeconfig: cluster.kubeconfig,
        endpoint: service.status.loadBalancer.ingress[0].hostname,
    };
}