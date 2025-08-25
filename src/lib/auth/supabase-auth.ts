import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import logger from 'logger'
import { userRepository } from '@/lib/db/repository'

export const getSession = async () => {
  const supabase = await createClient()
  
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) {
    logger.error('No session found')
    return null
  }

  // Ensure user exists in local database
  try {
    let dbUser = await userRepository.findById(user.id)
    
    if (!dbUser && user.email) {
      // Create user in local database if they don't exist
      dbUser = await userRepository.createUser({
        id: user.id,
        name: user.user_metadata?.full_name || user.email.split('@')[0],
        email: user.email,
        image: user.user_metadata?.avatar_url || null,
      })
      logger.info(`Created user in database: ${user.email}`)
    }
  } catch (err) {
    logger.error('Error ensuring user exists in database:', err)
  }
  
  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.user_metadata?.full_name || user.email,
      image: user.user_metadata?.avatar_url,
    }
  }
}

export const getUser = async () => {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) {
    return null
  }

  // Ensure user exists in local database
  try {
    let dbUser = await userRepository.findById(user.id)
    
    if (!dbUser && user.email) {
      // Create user in local database if they don't exist
      dbUser = await userRepository.createUser({
        id: user.id,
        name: user.user_metadata?.full_name || user.email.split('@')[0],
        email: user.email,
        image: user.user_metadata?.avatar_url || null,
      })
      logger.info(`Created user in database: ${user.email}`)
    }
  } catch (err) {
    logger.error('Error ensuring user exists in database:', err)
  }
  
  return {
    id: user.id,
    email: user.email,
    name: user.user_metadata?.full_name || user.email,
    image: user.user_metadata?.avatar_url,
  }
}

export const getSessionWithRedirect = async () => {
  const session = await getSession()
  
  if (!session) {
    redirect('/sign-in')
  }
  
  return session
}