import { getUsageFlowQueue } from "./bullmq";

type UsageFlowQueue = ReturnType<typeof getUsageFlowQueue>;

export const usageQueue = {
  add(...args: Parameters<UsageFlowQueue["add"]>) {
    return getUsageFlowQueue().add(...args);
  },
  addBulk(...args: Parameters<UsageFlowQueue["addBulk"]>) {
    return getUsageFlowQueue().addBulk(...args);
  },
};
