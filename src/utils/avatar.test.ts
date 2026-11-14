import test from 'node:test';
import assert from 'node:assert/strict';
import { getUserInitial, resolveUserAvatarUrl } from './avatar.ts';

test('resolveUserAvatarUrl checks all provider field variations in exact precedence order', () => {
  assert.equal(resolveUserAvatarUrl(null), undefined);
  assert.equal(resolveUserAvatarUrl({}), undefined);

  assert.equal(
    resolveUserAvatarUrl({
      photoURL: 'https://lh3.googleusercontent.com/photoURL',
      picture: 'https://lh3.googleusercontent.com/picture',
      avatar_url: 'https://lh3.googleusercontent.com/avatar_url',
      avatar: 'https://lh3.googleusercontent.com/avatar',
      user_metadata: {
        avatar_url: 'https://lh3.googleusercontent.com/meta_avatar',
        picture: 'https://lh3.googleusercontent.com/meta_picture',
      },
    }),
    'https://lh3.googleusercontent.com/photoURL'
  );

  assert.equal(
    resolveUserAvatarUrl({
      photoURL: '   ',
      picture: 'https://lh3.googleusercontent.com/picture',
      avatar_url: 'https://lh3.googleusercontent.com/avatar_url',
    }),
    'https://lh3.googleusercontent.com/picture'
  );

  assert.equal(
    resolveUserAvatarUrl({
      avatar_url: 'https://lh3.googleusercontent.com/avatar_url',
      avatar: 'https://lh3.googleusercontent.com/avatar',
    }),
    'https://lh3.googleusercontent.com/avatar_url'
  );

  assert.equal(
    resolveUserAvatarUrl({
      avatar: 'https://lh3.googleusercontent.com/avatar',
      user_metadata: { avatar_url: 'https://lh3.googleusercontent.com/meta_avatar' },
    }),
    'https://lh3.googleusercontent.com/avatar'
  );

  assert.equal(
    resolveUserAvatarUrl({
      user_metadata: {
        avatar_url: 'https://lh3.googleusercontent.com/meta_avatar',
        picture: 'https://lh3.googleusercontent.com/meta_picture',
      },
    }),
    'https://lh3.googleusercontent.com/meta_avatar'
  );

  assert.equal(
    resolveUserAvatarUrl({
      user_metadata: {
        avatar_url: '',
        picture: 'https://lh3.googleusercontent.com/meta_picture',
      },
    }),
    'https://lh3.googleusercontent.com/meta_picture'
  );
});

test('getUserInitial falls back cleanly from name to email to U', () => {
  assert.equal(getUserInitial({ name: 'Rakib' }), 'R');
  assert.equal(getUserInitial({ name: '  tanvir ' }), 'T');
  assert.equal(getUserInitial({ name: '', email: 'rakib@gmail.com' }), 'R');
  assert.equal(getUserInitial(null), 'U');
});
