export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { connectToDatabase } = await import('@/lib/db/mongoose');
    try {
      await connectToDatabase();
    } catch (error) {
      console.error('❌ Failed to connect to MongoDB:', error);
    }
  }
}
