import * as aws from "@pulumi/aws";
import * as eks from "@pulumi/eks";
import * as k8s from "@pulumi/kubernetes";
import * as pulumi from "@pulumi/pulumi";

export function createK8sCluster() {
    // 1. Descoberta da VPC e Subnets (seu código original)
    const defaultVpc = aws.ec2.getVpc({ default: true });
    const filteredSubnets = defaultVpc.then(vpc => 
        aws.ec2.getSubnets({ 
            filters: [
                { name: "vpc-id", values: [vpc.id] },
                { name: "availability-zone", values: ["us-east-1a", "us-east-1b", "us-east-1c", "us-east-1d"] }
            ] 
        })
    );

    // 2. Criação do Cluster EKS com suporte a Access Entries
    // 3. Criação do Cluster EKS
    const cluster = new eks.Cluster("meu-cluster-eks", {
        vpcId: defaultVpc.then(vpc => vpc.id),
        publicSubnetIds: filteredSubnets.then(s => s.ids),
    
    // CORREÇÃO AQUI: No @pulumi/eks, usamos apenas o modo de autenticação.
    // O Pulumi EKS por padrão já tenta dar acesso ao criador (seu GitHub OIDC).
        authenticationMode: "API",
    
        desiredCapacity: 2,
        minSize: 1,
        maxSize: 2,
        instanceType: "t3.medium", 
        version: "1.31",
        nodeAssociatePublicIpAddress: true,
    });

// 4. PERMISSÃO PARA O USUÁRIO CLOUD_USER (O "Humano" no Console)
// Aqui usamos o recurso NATIVO da AWS para criar a entrada de acesso
    const cloudUserAccess = new aws.eks.AccessEntry("cloud-user-console-access", {
    // Usamos .eksCluster.name para pegar o nome real do cluster criado pelo componente
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

    // --- Restante do código (Deployment/Service) ---
    // ... (mantenha como estava)

    return {
        clusterName: cluster.eksCluster.name,
        kubeconfig: cluster.kubeconfig,
    };
}