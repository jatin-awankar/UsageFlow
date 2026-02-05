import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
    return [
        {
            url: "https://usageflow.vercel.app",
            lastModified: new Date(),
        },
    ];
}
