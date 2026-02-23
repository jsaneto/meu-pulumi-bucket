import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

export const createRedisCluster = (securityGroupId: pulumi.Input<string>) => {
    
    // 1. Buscar a VPC padrão do A Cloud Guru
    const vpc = aws.ec2.getVpc({ default: true });
    
    // 2. Buscar as Subnets dessa VPC
    const subnets = vpc.then(v => 
        aws.ec2.getSubnets({ filters: [{ name: "vpc-id", values: [v.id] }] })
    );

    // 3. Criar o Subnet Group (Necessário para o ElastiCache)
    const redisSubnetGroup = new aws.elasticache.SubnetGroup("redis-sn-group", {
        subnetIds: subnets.then(s => s.ids),
    });

    // 4. Criar o Cluster Redis
    const cluster = new aws.elasticache.Cluster("meu-redis-acg", {
        engine: "redis",
        nodeType: "cache.t3.micro", // Ideal para o budget do ACG
        numCacheNodes: 1,
        parameterGroupName: "default.redis7",
        port: 6379,
        securityGroupIds: [securityGroupId],
        subnetGroupName: redisSubnetGroup.name,
    });

    return cluster;
};