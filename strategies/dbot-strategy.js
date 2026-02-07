<xml xmlns="http://www.w3.org/1999/xhtml" collection="false">
  <block type="trade_definition" id="trade_def" x="0" y="0">
    <value name="TRADETYPE">
      <shadow type="text">
        <field name="TEXT">rise</field>
      </shadow>
    </value>
    <value name="MARKET">
      <shadow type="text">
        <field name="TEXT">1HZ100V</field>
      </shadow>
    </value>
    <value name="CANDLEINTERVAL">
      <shadow type="text">
        <field name="TEXT">1s</field>
      </shadow>
    </value>
    <value name="RESTARTBUYSELL">
      <shadow type="math_number">
        <field name="NUM">1</field>
      </shadow>
    </value>
    <value name="RESTARTONERROR">
      <shadow type="math_number">
        <field name="NUM">1</field>
      </shadow>
    </value>
  </block>
  
  <block type="before_purchase" id="strategy" x="0" y="220">
    <statement name="statement">
      <block type="controls_repeat_ext" id="repeat">
        <value name="TIMES">
          <shadow type="math_number">
            <field name="NUM">999999</field>
          </shadow>
        </value>
        <statement name="DO">
          <block type="purchase" id="purchase_call">
            <value name="BET">
              <shadow type="math_number">
                <field name="NUM">1</field>
              </shadow>
            </value>
            <next>
              <block type="math_change" id="math_change_loss">
                <field name="VAR">BET</field>
                <value name="DELTA">
                  <shadow type="math_number">
                    <field name="NUM">1</field>
                  </shadow>
                </value>
                <next>
                  <block type="trade_again" id="trade_again_loss"></block>
                </next>
              </block>
            </next>
          </block>
        </statement>
      </block>
    </statement>
  </block>
  
  <block type="during_purchase" id="during_purch" x="0" y="420"></block>
  
  <block type="after_purchase" id="after_purch" x="0" y="620">
    <statement name="statement">
      <block type="controls_if" id="controls_if">
        <value name="IF0">
          <block type="logic_compare" id="logic_compare">
            <field name="OP">LT</field>
            <value name="A">
              <block type="variables_get" id="profit_loss_get">
                <field name="VAR">TOTAL_PROFIT_LOSS</field>
              </block>
            </value>
            <value name="B">
              <block type="math_number" id="math_number_loss">
                <field name="NUM">-5</field>
              </block>
            </value>
          </block>
        </value>
        <statement name="DO0">
          <block type="controls_stop" id="stop_loss">
            <field name="STOP_OPTION">ALL</field>
          </block>
        </statement>
        <next>
          <block type="controls_if" id="controls_if_profit">
            <value name="IF0">
              <block type="logic_compare" id="logic_compare_profit">
                <field name="OP">GT</field>
                <value name="A">
                  <block type="variables_get" id="profit_loss_get_profit">
                    <field name="VAR">TOTAL_PROFIT_LOSS</field>
                  </block>
                </value>
                <value name="B">
                  <block type="math_number" id="math_number_profit">
                    <field name="NUM">10</field>
                  </block>
                </value>
              </block>
            </value>
            <statement name="DO0">
              <block type="controls_stop" id="stop_profit">
                <field name="STOP_OPTION">ALL</field>
              </block>
            </statement>
          </block>
        </next>
      </block>
    </statement>
  </block>
</xml>