import * as aws from "@pulumi/aws";

export function createEBSVolumes(availabilityZone: string = "us-east-1a") {
    const commonTags = { "Environment": "ACG-Sandbox", "Project": "Pulumi-EBS-Test" };

    // 1. SSD General Purpose (gp3) - Mínimo 1GB
    const gp3 = new aws.ebs.Volume("vol-gp3", {
        availabilityZone: availabilityZone,
        size: 1,
        type: "gp3",
        encrypted: true,
        tags: { ...commonTags, Name: "SSD-gp3-Standard" },
    });
/*
    // 2. Provisioned IOPS SSD (io2) - Mínimo 4GB
    const io2 = new aws.ebs.Volume("vol-io2", {
        availabilityZone: availabilityZone,
        size: 4,
        type: "io2",
        iops: 100, // Mínimo para io2
        tags: { ...commonTags, Name: "SSD-io2-HighPerf" },
    });

    // 3. Throughput Optimized HDD (st1) - Mínimo 125GB (Obrigatório por AWS)
    const st1 = new aws.ebs.Volume("vol-st1", {
        availabilityZone: availabilityZone,
        size: 125,
        type: "st1",
        tags: { ...commonTags, Name: "HDD-st1-Throughput" },
    });

    // 4. Cold HDD (sc1) - Mínimo 125GB (Obrigatório por AWS)
    const sc1 = new aws.ebs.Volume("vol-sc1", {
        availabilityZone: availabilityZone,
        size: 125,
        type: "sc1",
        tags: { ...commonTags, Name: "HDD-sc1-Archive" },
    });
*/
    return { gp3};
}