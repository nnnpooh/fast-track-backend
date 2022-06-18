import { Injectable } from '@nestjs/common';
import {
  InjectPersistenceManager,
  PersistenceManager,
  InjectCypher,
  Transactional,
  QuerySpecification,
} from '@liberation-data/drivine';
import { CypherStatement } from '@liberation-data/drivine';
import { TrackEntity } from '@/job/entities/track.entity';

@Injectable()
export class JobRepository {
  constructor(
    @InjectPersistenceManager()
    readonly persistenceManager: PersistenceManager,
  ) {}

  @Transactional()
  async getAllTracks(): Promise<TrackEntity[]> {
    return this.persistenceManager.query(
      new QuerySpecification<TrackEntity>(
        `match (track:TRACK)-[:HAS_TASK]->(task:TASK)
        with track, collect(task.status) as statusList
        with *, [status in statusList where status = 'SUCCESS'] as statusSuccess
        with *, [status in statusList where status = 'PENDING'] as statusPending
        return track{.*, countAll:size(statusList), countSuccess: size(statusSuccess), countPending: size(statusPending)}
        `,
      ).transform(TrackEntity),
    );
  }

  @Transactional()
  async getTrackCurrentTasks(trackId: string): Promise<any[]> {
    return this.persistenceManager.query(
      new QuerySpecification<any>(
        `
        match  p = (taskStart:TASK)-[:THEN*]->(taskEnd:TASK)
        match (track:TRACK)-[:HAS_TASK]->(taskStart)
        match (track:TRACK)-[:HAS_TASK]->(taskEnd)
        where taskStart.nodeType = 'START_NODE' AND taskEnd.nodeType= 'END_NODE' AND track.id = $1
        with [n in nodes(p) where n.status = 'PENDING' | n] as nodesPending
        with nodesPending[0] as nodesCurrent
        return nodesCurrent{.*}
        `,
      ).bind([trackId]),
    );
  }
}
