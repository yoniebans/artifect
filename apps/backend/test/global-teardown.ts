// test/global-teardown.ts
module.exports = async () => {
    console.log('🧹 Cleaning up test environment...');

    // Give time for any hanging connections to close
    console.log('⏱️ Waiting for connections to close...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    console.log('✅ Test environment cleanup complete');
};