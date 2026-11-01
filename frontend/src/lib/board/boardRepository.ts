import {
  BoardAuthorProfile,
  BoardPost,
  BoardComment,
  BoardLike,
} from '@/types/board';
import { adminDb, FieldValue } from '@/lib/firebaseAdmin';
import crypto from 'crypto';

/**
 * 게시판 저장소 추상 인터페이스
 */
export interface BoardRepository {
  createPost(
    post: Omit<
      BoardPost,
      'id' | 'createdAt' | 'updatedAt' | 'likeCount' | 'commentCount'
    >
  ): Promise<BoardPost>;

  getPosts(options?: {
    sort?: 'latest' | 'popular';
    page?: number;
    limit?: number;
  }): Promise<{ posts: BoardPost[]; total: number }>;

  getPostById(id: string): Promise<BoardPost | null>;

  deletePost(id: string, authorTokenHash: string): Promise<boolean>;

  createComment(
    comment: Omit<BoardComment, 'id' | 'createdAt'>
  ): Promise<BoardComment>;

  getComments(postId: string): Promise<BoardComment[]>;

  deleteComment(
    postId: string,
    commentId: string,
    authorTokenHash: string
  ): Promise<boolean>;

  toggleLike(
    postId: string,
    authorTokenHash: string
  ): Promise<{ liked: boolean; likeCount: number }>;

  isLiked(postId: string, authorTokenHash: string): Promise<boolean>;

  getAuthorProfile(
    authorTokenHash: string
  ): Promise<BoardAuthorProfile | null>;

  saveAuthorProfile(profile: BoardAuthorProfile): Promise<void>;

  clearForTest?(): void;
}

/**
 * 인메모리 게시판 저장소 구현체
 * 로컬 테스트, CI 및 Firebase 미설정 환경에서 100% 동일한 비즈니스 로직과 데이터 무결성 보장
 */
export class MemoryBoardRepository implements BoardRepository {
  private posts = new Map<string, BoardPost>();
  private comments = new Map<string, BoardComment>();
  private likes = new Map<string, BoardLike>();
  private authorProfiles = new Map<string, BoardAuthorProfile>();

  public clearForTest(): void {
    this.posts.clear();
    this.comments.clear();
    this.likes.clear();
    this.authorProfiles.clear();
  }

  async createPost(
    post: Omit<
      BoardPost,
      'id' | 'createdAt' | 'updatedAt' | 'likeCount' | 'commentCount'
    >
  ): Promise<BoardPost> {
    const now = Date.now();
    const id = `post_${now}_${crypto.randomBytes(4).toString('hex')}`;

    const newPost: BoardPost = {
      ...post,
      id,
      likeCount: 0,
      commentCount: 0,
      viewCount: 0,
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    };

    this.posts.set(id, { ...newPost });
    return { ...newPost };
  }

  async getPosts(options?: {
    sort?: 'latest' | 'popular';
    page?: number;
    limit?: number;
  }): Promise<{ posts: BoardPost[]; total: number }> {
    const sort = options?.sort || 'latest';
    const page = Math.max(1, options?.page || 1);
    const limit = Math.max(1, Math.min(50, options?.limit || 20));

    const activePosts = Array.from(this.posts.values()).filter(
      (p) => !p.isDeleted
    );

    if (sort === 'popular') {
      activePosts.sort((a, b) => {
        if (b.likeCount !== a.likeCount) {
          return b.likeCount - a.likeCount;
        }
        return b.createdAt - a.createdAt;
      });
    } else {
      activePosts.sort((a, b) => b.createdAt - a.createdAt);
    }

    const total = activePosts.length;
    const startIndex = (page - 1) * limit;
    const pagedPosts = activePosts.slice(startIndex, startIndex + limit);

    return {
      posts: pagedPosts.map((p) => ({ ...p })),
      total,
    };
  }

  async getPostById(id: string): Promise<BoardPost | null> {
    const post = this.posts.get(id);
    if (!post || post.isDeleted) {
      return null;
    }
    // Increment viewCount non-destructively
    post.viewCount = (post.viewCount || 0) + 1;
    return { ...post };
  }

  async deletePost(id: string, authorTokenHash: string): Promise<boolean> {
    const post = this.posts.get(id);
    if (!post || post.isDeleted) {
      return false;
    }
    if (post.authorTokenHash !== authorTokenHash) {
      return false;
    }
    post.isDeleted = true;
    post.updatedAt = Date.now();
    return true;
  }

  async createComment(
    comment: Omit<BoardComment, 'id' | 'createdAt'>
  ): Promise<BoardComment> {
    const post = this.posts.get(comment.postId);
    if (!post || post.isDeleted) {
      throw new Error(`Post ${comment.postId} not found`);
    }

    const now = Date.now();
    const id = `comment_${now}_${crypto.randomBytes(4).toString('hex')}`;

    const newComment: BoardComment = {
      ...comment,
      id,
      isDeleted: false,
      createdAt: now,
    };

    this.comments.set(id, { ...newComment });
    post.commentCount = (post.commentCount || 0) + 1;
    post.updatedAt = now;

    return { ...newComment };
  }

  async getComments(postId: string): Promise<BoardComment[]> {
    const post = this.posts.get(postId);
    if (!post || post.isDeleted) {
      return [];
    }

    return Array.from(this.comments.values())
      .filter((c) => c.postId === postId && !c.isDeleted)
      .sort((a, b) => a.createdAt - b.createdAt)
      .map((c) => ({ ...c }));
  }

  async deleteComment(
    postId: string,
    commentId: string,
    authorTokenHash: string
  ): Promise<boolean> {
    const comment = this.comments.get(commentId);
    if (!comment || comment.postId !== postId || comment.isDeleted) {
      return false;
    }
    if (comment.authorTokenHash !== authorTokenHash) {
      return false;
    }

    comment.isDeleted = true;
    const post = this.posts.get(postId);
    if (post) {
      post.commentCount = Math.max(0, (post.commentCount || 0) - 1);
      post.updatedAt = Date.now();
    }
    return true;
  }

  async toggleLike(
    postId: string,
    authorTokenHash: string
  ): Promise<{ liked: boolean; likeCount: number }> {
    const post = this.posts.get(postId);
    if (!post || post.isDeleted) {
      throw new Error(`Post ${postId} not found`);
    }

    const key = `${postId}_${authorTokenHash}`;
    const alreadyLiked = this.likes.has(key);

    if (alreadyLiked) {
      this.likes.delete(key);
      post.likeCount = Math.max(0, (post.likeCount || 0) - 1);
      post.updatedAt = Date.now();
      return { liked: false, likeCount: post.likeCount };
    } else {
      this.likes.set(key, {
        postId,
        authorTokenHash,
        createdAt: Date.now(),
      });
      post.likeCount = (post.likeCount || 0) + 1;
      post.updatedAt = Date.now();
      return { liked: true, likeCount: post.likeCount };
    }
  }

  async isLiked(postId: string, authorTokenHash: string): Promise<boolean> {
    const key = `${postId}_${authorTokenHash}`;
    return this.likes.has(key);
  }

  async getAuthorProfile(
    authorTokenHash: string
  ): Promise<BoardAuthorProfile | null> {
    const profile = this.authorProfiles.get(authorTokenHash);
    return profile ? { ...profile } : null;
  }

  async saveAuthorProfile(profile: BoardAuthorProfile): Promise<void> {
    this.authorProfiles.set(profile.authorTokenHash, { ...profile });
  }
}

/**
 * Google Cloud Firestore 기반 게시판 저장소 구현체
 */
export class FirestoreBoardRepository implements BoardRepository {
  private postsCol = 'board_posts';
  private commentsCol = 'board_comments';
  private likesCol = 'board_likes';
  private profilesCol = 'board_author_profiles';

  private get db() {
    if (!adminDb) {
      throw new Error('Firestore adminDb is not initialized');
    }
    return adminDb;
  }

  async createPost(
    post: Omit<
      BoardPost,
      'id' | 'createdAt' | 'updatedAt' | 'likeCount' | 'commentCount'
    >
  ): Promise<BoardPost> {
    const now = Date.now();
    const docRef = this.db.collection(this.postsCol).doc();
    const id = docRef.id;

    const newPost: BoardPost = {
      ...post,
      id,
      likeCount: 0,
      commentCount: 0,
      viewCount: 0,
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    };

    await docRef.set(newPost);
    return newPost;
  }

  async getPosts(options?: {
    sort?: 'latest' | 'popular';
    page?: number;
    limit?: number;
  }): Promise<{ posts: BoardPost[]; total: number }> {
    const sort = options?.sort || 'latest';
    const page = Math.max(1, options?.page || 1);
    const limit = Math.max(1, Math.min(50, options?.limit || 20));

    try {
      let query = this.db
        .collection(this.postsCol)
        .where('isDeleted', '==', false);

      if (sort === 'popular') {
        query = query
          .orderBy('likeCount', 'desc')
          .orderBy('createdAt', 'desc');
      } else {
        query = query.orderBy('createdAt', 'desc');
      }

      const snapshot = await query.get();
      const allPosts: BoardPost[] = [];
      snapshot.forEach((doc) => {
        allPosts.push(doc.data() as BoardPost);
      });

      const total = allPosts.length;
      const startIndex = (page - 1) * limit;
      const pagedPosts = allPosts.slice(startIndex, startIndex + limit);

      return { posts: pagedPosts, total };
    } catch {
      // 인덱스 생성 중이거나 에러 발생 시 메모리 정렬 폴백
      const snapshot = await this.db.collection(this.postsCol).get();
      const allPosts: BoardPost[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data() as BoardPost;
        if (!data.isDeleted) {
          allPosts.push(data);
        }
      });

      if (sort === 'popular') {
        allPosts.sort((a, b) => {
          if (b.likeCount !== a.likeCount) return b.likeCount - a.likeCount;
          return b.createdAt - a.createdAt;
        });
      } else {
        allPosts.sort((a, b) => b.createdAt - a.createdAt);
      }

      const total = allPosts.length;
      const startIndex = (page - 1) * limit;
      const pagedPosts = allPosts.slice(startIndex, startIndex + limit);

      return { posts: pagedPosts, total };
    }
  }

  async getPostById(id: string): Promise<BoardPost | null> {
    const docRef = this.db.collection(this.postsCol).doc(id);
    const snap = await docRef.get();
    if (!snap.exists) return null;

    const data = snap.data() as BoardPost;
    if (data.isDeleted) return null;

    // 비동기 viewCount 1 증가
    docRef
      .update({
        viewCount: FieldValue.increment(1),
      })
      .catch(() => {});

    return { ...data, viewCount: (data.viewCount || 0) + 1 };
  }

  async deletePost(id: string, authorTokenHash: string): Promise<boolean> {
    const docRef = this.db.collection(this.postsCol).doc(id);
    const snap = await docRef.get();
    if (!snap.exists) return false;

    const post = snap.data() as BoardPost;
    if (post.isDeleted || post.authorTokenHash !== authorTokenHash) {
      return false;
    }

    await docRef.update({
      isDeleted: true,
      updatedAt: Date.now(),
    });
    return true;
  }

  async createComment(
    comment: Omit<BoardComment, 'id' | 'createdAt'>
  ): Promise<BoardComment> {
    const postRef = this.db.collection(this.postsCol).doc(comment.postId);
    const commentRef = this.db.collection(this.commentsCol).doc();

    const now = Date.now();
    const newComment: BoardComment = {
      ...comment,
      id: commentRef.id,
      isDeleted: false,
      createdAt: now,
    };

    await this.db.runTransaction(async (tx) => {
      const postSnap = await tx.get(postRef);
      if (!postSnap.exists) {
        throw new Error(`Post ${comment.postId} not found`);
      }
      const postData = postSnap.data() as BoardPost;
      if (postData.isDeleted) {
        throw new Error(`Post ${comment.postId} is deleted`);
      }

      tx.set(commentRef, newComment);
      tx.update(postRef, {
        commentCount: FieldValue.increment(1),
        updatedAt: now,
      });
    });

    return newComment;
  }

  async getComments(postId: string): Promise<BoardComment[]> {
    const snap = await this.db
      .collection(this.commentsCol)
      .where('postId', '==', postId)
      .where('isDeleted', '==', false)
      .get();

    const comments: BoardComment[] = [];
    snap.forEach((doc) => {
      comments.push(doc.data() as BoardComment);
    });

    return comments.sort((a, b) => a.createdAt - b.createdAt);
  }

  async deleteComment(
    postId: string,
    commentId: string,
    authorTokenHash: string
  ): Promise<boolean> {
    const postRef = this.db.collection(this.postsCol).doc(postId);
    const commentRef = this.db.collection(this.commentsCol).doc(commentId);

    return await this.db.runTransaction(async (tx) => {
      const commentSnap = await tx.get(commentRef);
      if (!commentSnap.exists) return false;

      const comment = commentSnap.data() as BoardComment;
      if (
        comment.isDeleted ||
        comment.postId !== postId ||
        comment.authorTokenHash !== authorTokenHash
      ) {
        return false;
      }

      tx.update(commentRef, { isDeleted: true });
      tx.update(postRef, {
        commentCount: FieldValue.increment(-1),
        updatedAt: Date.now(),
      });

      return true;
    });
  }

  async toggleLike(
    postId: string,
    authorTokenHash: string
  ): Promise<{ liked: boolean; likeCount: number }> {
    const postRef = this.db.collection(this.postsCol).doc(postId);
    const likeDocId = `${postId}_${authorTokenHash}`;
    const likeRef = this.db.collection(this.likesCol).doc(likeDocId);

    return await this.db.runTransaction(async (tx) => {
      const postSnap = await tx.get(postRef);
      if (!postSnap.exists) {
        throw new Error(`Post ${postId} not found`);
      }
      const postData = postSnap.data() as BoardPost;
      if (postData.isDeleted) {
        throw new Error(`Post ${postId} is deleted`);
      }

      const likeSnap = await tx.get(likeRef);
      if (likeSnap.exists) {
        tx.delete(likeRef);
        const newCount = Math.max(0, (postData.likeCount || 0) - 1);
        tx.update(postRef, {
          likeCount: newCount,
          updatedAt: Date.now(),
        });
        return { liked: false, likeCount: newCount };
      } else {
        const likeRecord: BoardLike = {
          postId,
          authorTokenHash,
          createdAt: Date.now(),
        };
        tx.set(likeRef, likeRecord);
        const newCount = (postData.likeCount || 0) + 1;
        tx.update(postRef, {
          likeCount: newCount,
          updatedAt: Date.now(),
        });
        return { liked: true, likeCount: newCount };
      }
    });
  }

  async isLiked(postId: string, authorTokenHash: string): Promise<boolean> {
    const likeDocId = `${postId}_${authorTokenHash}`;
    const snap = await this.db.collection(this.likesCol).doc(likeDocId).get();
    return snap.exists;
  }

  async getAuthorProfile(
    authorTokenHash: string
  ): Promise<BoardAuthorProfile | null> {
    const snap = await this.db
      .collection(this.profilesCol)
      .doc(authorTokenHash)
      .get();
    if (!snap.exists) return null;
    return snap.data() as BoardAuthorProfile;
  }

  async saveAuthorProfile(profile: BoardAuthorProfile): Promise<void> {
    await this.db
      .collection(this.profilesCol)
      .doc(profile.authorTokenHash)
      .set(profile, { merge: true });
  }
}

// Global singleton instance keeper
const globalContext = globalThis as unknown as {
  __dviewBoardRepo?: BoardRepository;
  __dviewMemoryBoardRepo?: MemoryBoardRepository;
};

/**
 * 게시판 저장소 팩토리 함수
 * Firebase Admin이 구성되어 있으면 FirestoreBoardRepository, 그렇지 않거나 테스트 시 MemoryBoardRepository 반환
 */
export function getBoardRepository(forceMemory = false): BoardRepository {
  if (forceMemory) {
    if (!globalContext.__dviewMemoryBoardRepo) {
      globalContext.__dviewMemoryBoardRepo = new MemoryBoardRepository();
    }
    return globalContext.__dviewMemoryBoardRepo;
  }

  if (globalContext.__dviewBoardRepo) {
    return globalContext.__dviewBoardRepo;
  }

  if (adminDb) {
    globalContext.__dviewBoardRepo = new FirestoreBoardRepository();
  } else {
    if (!globalContext.__dviewMemoryBoardRepo) {
      globalContext.__dviewMemoryBoardRepo = new MemoryBoardRepository();
    }
    globalContext.__dviewBoardRepo = globalContext.__dviewMemoryBoardRepo;
  }

  return globalContext.__dviewBoardRepo;
}

/**
 * 테스트용 저장소 교체 헬퍼
 */
export function setBoardRepository(repo: BoardRepository | null): void {
  if (repo === null) {
    delete globalContext.__dviewBoardRepo;
  } else {
    globalContext.__dviewBoardRepo = repo;
  }
}
