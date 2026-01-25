describe('Example Test Suite', () => {
  it('should pass a basic test', () => {
    expect(true).toBe(true);
  });

  it('should perform basic math operations', () => {
    expect(1 + 1).toBe(2);
    expect(10 - 5).toBe(5);
  });

  it('should work with strings', () => {
    const greeting = 'Hello, Ellie!';
    expect(greeting).toContain('Ellie');
  });

  it('should work with arrays', () => {
    const numbers = [1, 2, 3, 4, 5];
    expect(numbers).toHaveLength(5);
    expect(numbers).toContain(3);
  });
});
