import { describe, expect, it } from 'vitest';
import { extensionFor, imageIdsIn, pathFor } from './uploads';

const ID = 'a'.repeat(64);

describe('pathFor', () => {
  it('names the file after the id and its format', () => {
    expect(pathFor(ID, 'image/webp')).toMatch(new RegExp(`${ID}\\.webp$`));
    expect(pathFor(ID, 'image/jpeg')).toMatch(/\.jpg$/);
  });

  it.each([
    ['../../etc/passwd', 'traversal'],
    ['a/b', 'a slash'],
    ['A'.repeat(64), 'uppercase, which a sha256 hex digest never is'],
    ['abc', 'too short'],
    ['', 'empty'],
  ])('rejects %j (%s)', id => {
    expect(() => pathFor(id, 'image/png')).toThrow('Bad image id');
  });
});

describe('extensionFor', () => {
  it('maps the formats the upload route accepts', () => {
    expect(extensionFor('image/png')).toBe('png');
    expect(extensionFor('image/jpeg')).toBe('jpg');
    expect(extensionFor('image/avif')).toBe('avif');
  });

  it('falls back rather than trusting an unknown type into the filename', () => {
    expect(extensionFor('application/x-evil')).toBe('bin');
  });
});

describe('imageIdsIn', () => {
  it('finds every image a note references', () => {
    const b = 'b'.repeat(64);
    const markdown = `![one](/api/images/${ID})\n\ntext\n\n![two](/api/images/${b})`;
    expect(imageIdsIn(markdown)).toEqual([ID, b]);
  });

  it('reports a repeat twice, so callers can count references', () => {
    expect(imageIdsIn(`![a](/api/images/${ID}) ![b](/api/images/${ID})`)).toHaveLength(2);
  });

  it('ignores anything that is not a full digest', () => {
    expect(imageIdsIn('![x](/api/images/nope) ![y](/api/images/abc123)')).toEqual([]);
  });

  it('finds none in a note without images', () => {
    expect(imageIdsIn('# Heading\n\nJust words.')).toEqual([]);
  });
});
