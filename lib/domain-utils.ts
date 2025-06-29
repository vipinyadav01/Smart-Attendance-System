/**
 * Get the allowed email domains from environment variables
 * Supports multiple domains separated by commas
 */
export function getAllowedEmailDomains(): string[] {
  const domains = process.env.NEXT_PUBLIC_ALLOWED_EMAIL_DOMAINS || 
                 process.env.ALLOWED_EMAIL_DOMAINS || 
                 process.env.NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN || 
                 process.env.ALLOWED_EMAIL_DOMAIN || 
                 "gla.ac.in"
  
  // Split by comma and clean up whitespace
  return domains.split(',').map(domain => domain.trim()).filter(domain => domain.length > 0)
}

/**
 * Get the primary allowed email domain (first one in the list)
 */
export function getPrimaryEmailDomain(): string {
  const domains = getAllowedEmailDomains()
  return domains[0] || "gla.ac.in"
}

/**
 * Check if an email is from any of the allowed domains
 */
export function isEmailFromAllowedDomain(email: string): boolean {
  if (!email) return false
  
  const allowedDomains = getAllowedEmailDomains()
  const emailLower = email.toLowerCase()
  
  return allowedDomains.some(domain => {
    const domainLower = domain.toLowerCase()
    return emailLower.endsWith(`@${domainLower}`)
  })
}

/**
 * Get the domain validation error message
 */
export function getDomainValidationMessage(): string {
  const allowedDomains = getAllowedEmailDomains()
  
  if (allowedDomains.length === 1) {
    return `Email must be from ${allowedDomains[0]} domain`
  } else if (allowedDomains.length === 2) {
    return `Email must be from ${allowedDomains[0]} or ${allowedDomains[1]} domain`
  } else {
    const lastDomain = allowedDomains[allowedDomains.length - 1]
    const otherDomains = allowedDomains.slice(0, -1).join(', ')
    return `Email must be from ${otherDomains}, or ${lastDomain} domain`
  }
}

/**
 * Get formatted domain list for display
 */
export function getFormattedDomainList(): string {
  const allowedDomains = getAllowedEmailDomains()
  
  if (allowedDomains.length === 1) {
    return allowedDomains[0]
  } else if (allowedDomains.length === 2) {
    return allowedDomains.join(' or ')
  } else {
    const lastDomain = allowedDomains[allowedDomains.length - 1]
    const otherDomains = allowedDomains.slice(0, -1).join(', ')
    return `${otherDomains}, or ${lastDomain}`
  }
}
