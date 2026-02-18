import * as aws from "@pulumi/aws";
import * as eks from "@pulumi/eks";
import * as k8s from "@pulumi/kubernetes";
import * as pulumi from "@pulumi/pulumi";

export function createK8sCluster() {
    // 1. VPC e Subnets
    const defaultVpc = aws.ec2.getVpc({ default: true });
    const filteredSubnets = defaultVpc.then(vpc => 
        aws.ec2.getSubnets({ 
            filters: [
                { name: "vpc-id", values: [vpc.id] },
                { name: "availability-zone", values: ["us-east-1a", "us-east-1b", "us-east-1c", "us-east-1d"] }
            ] 
        })
    );

    // 2. Cluster EKS
    const cluster = new eks.Cluster("meu-cluster-eks", {
        vpcId: defaultVpc.then(vpc => vpc.id),
        publicSubnetIds: filteredSubnets.then(s => s.ids),
        authenticationMode: "API", // Modo moderno
        desiredCapacity: 2,
        minSize: 1,
        maxSize: 2,
        instanceType: "t3.medium", 
        version: "1.31",
        nodeAssociatePublicIpAddress: true,
    });

    // 3. Acesso para você (Cloud Guru) ver no console
    const cloudUserAccess = new aws.eks.AccessEntry("cloud-user-console-access", {
        clusterName: cluster.eksCluster.name, 
        principalArn: "arn:aws:iam::741960641592:user/cloud_user",
        type: "STANDARD",
    });

    new aws.eks.AccessPolicyAssociation("cloud-user-admin-policy", {
        clusterName: cluster.eksCluster.name,
        principalArn: cloudUserAccess.principalArn,
        policyArn: "arn:aws:eks::aws:cluster-access-policy/AmazonEKSClusterAdminPolicy",
        accessScope: { type: "cluster" },
    });

    // --- A CHAVE DO PROBLEMA ESTÁ AQUI EMBAIXO ---

    // 4. Criamos um Provider que usa o kubeconfig do cluster NOVO
    const k8sProvider = new k8s.Provider("k8s-provider", {
        kubeconfig: cluster.kubeconfig,
    });

    // 5. Agora sim, o Nginx usando o provider correto
    const appLabels = { app: "nginx-k8s" };
    
    const deployment = new k8s.apps.v1.Deployment("nginx-dep", {
        spec: {
            selector: { matchLabels: appLabels },
            replicas: 2,
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
    }, { provider: k8sProvider }); // <--- Se faltar isso, o Nginx não é criado no EKS

    const service = new k8s.core.v1.Service("nginx-svc", {
        spec: {
            type: "LoadBalancer",
            ports: [{ port: 80, targetPort: 80 }],
            selector: appLabels,
        },
    }, { provider: k8sProvider }); // <--- Se faltar isso, o ELB não aparece na AWS

    return {
        clusterName: cluster.eksCluster.name,
        kubeconfig: cluster.kubeconfig,
        endpoint: service.status.loadBalancer.ingress[0].hostname,
    };
}