export default function (pi: any) {
  pi.registerTool({
    name: "approve_refund",
    label: "Approve Refund",
    description: "Approve a refund that exceeds a support agent's limit",
    parameters: {
      type: "object",
      properties: {
        ticket_id: { type: "number", description: "The ticket ID" },
        amount: { type: "number", description: "Refund amount to approve" },
        reason: { type: "string", description: "Justification for approval" }
      },
      required: ["ticket_id", "amount"]
    },
    async execute(_toolCallId: string, params: any, _signal: any, _onUpdate: any, _ctx: any) {
      return {
        content: [{ type: "text", text: `Refund of $${params.amount} approved for ticket #${params.ticket_id}.` }],
        details: {},
      };
    },
  });

  pi.registerTool({
    name: "override_policy",
    label: "Override Policy",
    description: "Override standard company policy with justification (e.g., extended return window, waived fees)",
    parameters: {
      type: "object",
      properties: {
        ticket_id: { type: "number", description: "The ticket ID" },
        justification: { type: "string", description: "Why the policy override is warranted" }
      },
      required: ["ticket_id", "justification"]
    },
    async execute(_toolCallId: string, params: any, _signal: any, _onUpdate: any, _ctx: any) {
      return {
        content: [{ type: "text", text: `Policy override applied to ticket #${params.ticket_id}.` }],
        details: {},
      };
    },
  });

  pi.registerTool({
    name: "reassign_ticket",
    label: "Reassign Ticket",
    description: "Reassign a ticket to a different support agent",
    parameters: {
      type: "object",
      properties: {
        ticket_id: { type: "number", description: "The ticket ID" },
        to_agent: { type: "string", description: "Agent ID to reassign to" }
      },
      required: ["ticket_id", "to_agent"]
    },
    async execute(_toolCallId: string, params: any, _signal: any, _onUpdate: any, _ctx: any) {
      return {
        content: [{ type: "text", text: `Ticket #${params.ticket_id} reassigned to ${params.to_agent}.` }],
        details: {},
      };
    },
  });
}
