/**
 * Enhanced debugging for OpenRouter responses
 */
async function debugOpenRouterResponse(data) {
  logger.info(`[OpenRouter] Response received:`, {
    status: data?.status || 'unknown',
    metadata: metadata || 'no_metadata'
  });
  
  if (!data?.choices?.[0]?.message?.content) {
    logger.error(`[OpenRouter] No content in response:`, data);
    
    // Check if it's a rate limit or model error
    const errorDetail = data?.error?.message || data?.error?.detail || JSON.stringify(data);
    
    if (errorDetail.includes('rate_limit') || errorDetail.includes('quota')) {
      throw new Error(`OpenRouter rate limit exceeded on free model. Try a different model or upgrade API key.`);
    }
    
    // Log the first part of the data for debugging
    logger.debug('OpenRouter Response Object:', {
      choices_count: data?.choices?.length || 0,
      model: data?.model || 'unknown',
      full_response: JSON.stringify(data, null, 2),
      usage: data?.usage || null,
      model: data?.model || 'unknown'
    });
    
    // Return content
    const content = data?.choices?.[0]?.message?.content || "";
    const totalTokens = data?.usage?.total_tokens || data?.output_tokens || 0;
    
    logger.info(`[OpenRouter] Success: content_length=${content?.length || 0}, tokens=${totalTokens}`);
    
    return {
      content,
      usage: data?.usage || null,
      tokensUsed: totalTokens,
    };
  }
  
}
