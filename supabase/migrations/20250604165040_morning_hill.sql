/*
  # Add Math Misconception Tags

  1. Changes
    - Add additional misconception tags to the misconceptions table
    - These tags are used by the AI when generating distractor options
  
  2. Purpose
    - Fix foreign key constraint errors when generating questions
    - Provide better targeted explanations for common misconceptions
*/

-- Insert new math misconception tags
INSERT INTO misconceptions (tag, explanation) 
VALUES
  ('confusing-prime-and-composite', 'Remember that prime numbers have exactly two factors (1 and themselves), while composite numbers have more than two factors.'),
  ('misunderstanding-factors', 'A factor of a number divides the number without leaving a remainder. For example, the factors of 12 are 1, 2, 3, 4, 6, and 12.'),
  ('misunderstanding-prime-numbers', 'A prime number is a number greater than 1 that has exactly two factors: 1 and itself. Examples include 2, 3, 5, 7, 11, etc.'),
  ('limited-factors', 'Remember that a number can have multiple factors. For instance, 36 has factors 1, 2, 3, 4, 6, 9, 12, 18, and 36.'),
  ('counting-factors', 'When counting factors, make sure to identify all numbers that divide evenly into the given number.'),
  ('prime-only', 'Factors can be both prime and composite numbers. For example, the factors of 12 include prime numbers (2, 3) and composite numbers (4, 6, 12).'),
  ('thinks-all-factors-are-larger', 'Factors can be smaller than, equal to, or larger than each other. When a number has a factor, that factor divides the number evenly.'),
  ('confuses-factors-with-multiples', 'Factors divide a number without a remainder. Multiples are the result of multiplying a number by an integer.'),
  ('thinks-factors-must-be-multiples', 'A factor of a number divides the number evenly, while a multiple of a number is the result of multiplying it by another number.'),
  ('underestimating-the-number', 'When identifying the correct number based on its factors, make sure to account for all the listed factors.'),
  ('incorrect-factors', 'Check your list of factors carefully. A number is a factor if and only if it divides the original number without a remainder.'),
  ('thinks-all-numbers-are-factors', 'Not all numbers are factors of a given number. A factor must divide the number evenly without a remainder.'),
  ('does-not-know-factors', 'The factors of a number are the numbers that divide it evenly (with no remainder).'),
  ('not-considering-the-greatest-factor', 'When finding the greatest factor with specific properties, check all possible factors in descending order.'),
  ('incorrectly-identifying-the-greatest-factor', 'The greatest factor of a number (other than the number itself) must divide the number evenly without a remainder.')
ON CONFLICT (tag) DO UPDATE 
SET explanation = EXCLUDED.explanation;