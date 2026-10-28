import http.client
import json
import threading
import unittest
from unittest.mock import patch, MagicMock
import server

AGGREGATE={'month':'2026-10','metric':'Won revenue','brief':'Two won deals generated $100.', 'totals':{'revenue':10000,'deals':2},'rankings':{'rep':[{'name':'Rep A','value':10000,'won':2}]}}

class LocalAITests(unittest.TestCase):
    def test_local_model_contract_and_aggregate_only_prompt(self):
        with patch('server.local_request',side_effect=[{'models':[{'name':'llama3.2:3b'}]}, {'message':{'content':'Two deals generated $100.'}}]) as request:
            self.assertEqual(server.draft({'model':'llama3.2:3b','aggregate':AGGREGATE}),'Two deals generated $100.')
            self.assertEqual(request.call_args_list[0].args[0],'/api/tags')
            self.assertEqual(request.call_args_list[0].kwargs,{'method':'GET'})
            path,payload=request.call_args_list[1].args
            self.assertEqual(path,'/api/chat');self.assertFalse(payload['stream'])
            self.assertEqual(json.loads(payload['messages'][1]['content']),AGGREGATE)
            self.assertNotIn('deal_id',payload['messages'][1]['content'])
    def test_cloud_and_remote_model_rejection(self):
        with self.assertRaises(ValueError):server.draft({'model':'model:cloud','aggregate':AGGREGATE})
        with patch('server.local_request',return_value={'models':[{'name':'alias','remote_host':'https://example.org'}]}) as request:
            with self.assertRaises(ValueError):server.draft({'model':'alias','aggregate':AGGREGATE})
            self.assertEqual(request.call_count,1)
    def test_raw_or_unexpected_payload_rejected(self):
        with self.assertRaises(ValueError):server.draft({'model':'local','aggregate':{'rows':[{'deal_id':'secret'}]}})
    def test_empty_or_oversized_model_response_rejected(self):
        for value in ['', 'word '*151, None]:
            with patch('server.local_request',side_effect=[{'models':[{'name':'local'}]}, {'message':{'content':value}}]):
                with self.assertRaises(ValueError):server.draft({'model':'local','aggregate':AGGREGATE})
    def test_transport_fixed_to_loopback(self):
        conn=MagicMock();conn.getresponse.return_value.status=200;conn.getresponse.return_value.read.return_value=b'{}'
        with patch('server.http.client.HTTPConnection',return_value=conn) as transport:
            server.local_request('/api/show',{'model':'local'});self.assertEqual(transport.call_args.args,('127.0.0.1',11434))
    def test_http_static_route_ai_and_cross_origin_guard(self):
        app=server.ThreadingHTTPServer(('127.0.0.1',0),server.Handler);thread=threading.Thread(target=app.serve_forever,daemon=True);thread.start()
        try:
            conn=http.client.HTTPConnection('127.0.0.1',app.server_port)
            headers={'Host':'127.0.0.1:8767','Origin':'http://127.0.0.1:8767','Content-Type':'application/json'}
            conn.request('GET','/',headers=headers);response=conn.getresponse();self.assertEqual(response.status,200);self.assertIn(b'Sales Lens',response.read())
            conn.request('GET','/server.py',headers=headers);response=conn.getresponse();response.read();self.assertEqual(response.status,404)
            with patch('server.draft',return_value='A local draft.'):
                conn.request('POST','/api/summary',json.dumps({'model':'local','aggregate':AGGREGATE}),headers);response=conn.getresponse();self.assertEqual(response.status,200);self.assertEqual(json.loads(response.read())['summary'],'A local draft.')
            conn.request('POST','/api/summary','{}',{'Host':'127.0.0.1:8767','Origin':'https://attacker.example'});response=conn.getresponse();response.read();self.assertEqual(response.status,403)
            conn.request('GET','/',headers={'Host':'attacker.example'});response=conn.getresponse();response.read();self.assertEqual(response.status,403)
            conn.close()
        finally:app.shutdown();app.server_close();thread.join()

if __name__=='__main__':unittest.main()
