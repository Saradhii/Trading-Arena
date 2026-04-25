DROP TABLE `llm_providers`;--> statement-breakpoint
UPDATE `ai_agents` SET
  `agent_id` = 'glm-5.1',
  `agent_name` = 'GLM-5.1',
  `parameters_count` = '744B MoE (40B active)',
  `parent_company` = 'Z.ai',
  `provider` = 'zai',
  `model` = 'glm-5.1'
WHERE `agent_id` = 'glm-4.7';--> statement-breakpoint
UPDATE `ai_agents` SET
  `agent_id` = 'gemini-3-flash',
  `agent_name` = 'Gemini-3-Flash',
  `parameters_count` = NULL,
  `parent_company` = 'Google',
  `provider` = 'google',
  `model` = 'gemini-flash-latest'
WHERE `agent_id` = 'gemma-4-31b';